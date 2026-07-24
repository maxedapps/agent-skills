#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "render_graphics.py"
spec = importlib.util.spec_from_file_location("render_graphics", SCRIPT)
assert spec and spec.loader
rg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rg)


class GeometryTests(unittest.TestCase):
    def test_keyframes_interpolate_normalized_rect(self):
        target = {"mode": "keyframes", "keyframes": [
            {"time": 1, "rect": [0.1, 0.2, 0.3, 0.2]},
            {"time": 3, "rect": [0.1, 0.4, 0.3, 0.2]},
        ]}
        self.assertEqual(rg.rect_at(target, 2), [0.1, 0.30000000000000004, 0.3, 0.2])

    def test_clockwise_path_starts_at_top_left_tangent(self):
        path = rg.rounded_clockwise_path((10, 20, 110, 70), 10)
        self.assertEqual(path[0], (20, 20))
        self.assertEqual(path[1], (100, 20))
        half = rg.partial_path(path, 0.5)
        self.assertGreater(len(half), 2)
        self.assertLess(len(half), len(path))

    def test_lower_third_staggers_and_reverses(self):
        animation = {"exitSeconds": 0.64}
        entering = rg.lower_state(3.3, 3, 8, animation)
        self.assertGreater(entering["name"], entering["subtitle"])
        exiting = rg.lower_state(7.7, 3, 8, animation)
        self.assertGreater(exiting["name"], exiting["subtitle"])


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe") and rg.Image is not None, "ffmpeg/Pillow required")
class IntegrationTest(unittest.TestCase):
    def test_spotlight_clip_keeps_audio_and_timing(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source, config, output = root / "source.mp4", root / "job.json", root / "out.mp4"
            make = subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=0x303030:s=320x180:r=30:d=1.2",
                "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1.2",
                "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(source),
            ], capture_output=True, text=True)
            self.assertEqual(make.returncode, 0, make.stderr[-1200:])
            config.write_text(json.dumps({
                "clip": {"start": 0.1, "duration": 1.0},
                "overlays": [{"preset": "spotlight-clean", "start": 0.1, "end": 0.9,
                              "target": {"mode": "rect", "rect": [0.4, 0.3, 0.3, 0.3]}}],
            }))
            rendered = subprocess.run([
                "python3", str(SCRIPT), "--input", str(source), "--config", str(config),
                "--output", str(output), "--work-dir", str(root / "work"), "--encoder", "libx264",
            ], capture_output=True, text=True)
            self.assertEqual(rendered.returncode, 0, rendered.stderr[-1500:])
            result = json.loads(rendered.stdout)
            self.assertTrue(output.is_file())
            self.assertAlmostEqual(result["result"]["duration"], 1.0, delta=0.08)
            self.assertTrue(result["result"]["audio"])
            self.assertEqual(result["result"]["width"], 320)
            self.assertEqual(result["result"]["height"], 180)


if __name__ == "__main__":
    unittest.main()
