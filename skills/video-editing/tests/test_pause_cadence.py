from __future__ import annotations

import json
import math
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
import wave
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
SCRIPTS = SKILL / "scripts"
sys.path.insert(0, str(SCRIPTS))

from audit_pauses import DEFAULT_THRESHOLDS, audit  # noqa: E402
from build_filter import finalize_ranges, map_accepted_pauses  # noqa: E402
from classify_joins import classify  # noqa: E402


def write_wav(path: Path, duration: float, regions: list[tuple[float, float, float, float]], sr: int = 8000) -> None:
    """Write mono PCM; regions are start/end/amplitude/frequency."""
    samples = [0] * int(duration * sr)
    for start, end, amplitude, frequency in regions:
        for index in range(max(0, int(start * sr)), min(len(samples), int(end * sr))):
            samples[index] = int(amplitude * math.sin(2 * math.pi * frequency * index / sr))
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sr)
        output.writeframes(struct.pack("<" + "h" * len(samples), *samples))


def spectral_power(samples: list[int], sr: int, frequency: float) -> float:
    real = 0.0
    imag = 0.0
    for index, sample in enumerate(samples):
        angle = 2 * math.pi * frequency * index / sr
        real += sample * math.cos(angle)
        imag -= sample * math.sin(angle)
    return real * real + imag * imag


class ClassifyJoinTests(unittest.TestCase):
    def test_explicit_semantics_survive_and_next_in_uses_final_out(self) -> None:
        keeps = [
            {"start": 0.0, "end": 1.0, "join": "section", "out": "surgical"},
            {"start": 5.0, "end": 6.0, "join": "sentence"},
        ]
        result = classify(keeps, 0.8, 2.5)
        self.assertEqual(result[0]["join"], "section")
        self.assertEqual(result[0]["out"], "surgical")
        self.assertEqual(result[1]["join"], "sentence")
        self.assertEqual(result[1]["in"], "tight")
        self.assertEqual(result[0]["_suggested_out"], "section")


class PauseAuditTests(unittest.TestCase):
    def test_internal_long_pause_is_review_candidate(self) -> None:
        cues = [{"i": 1, "start": 0.0, "end": 3.0, "text": "A complete uninterrupted thought"}]
        findings = audit(
            [(0.8, 1.6)], cues, thresholds=DEFAULT_THRESHOLDS,
            exemptions=[], plan=None,
        )
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["kind"], "internal")
        self.assertFalse(findings[0]["accepted"])

    def test_related_sentence_inter_cue_pause_is_candidate(self) -> None:
        cues = [
            {"i": 1, "start": 0.0, "end": 0.5, "text": "First point."},
            {"i": 2, "start": 1.65, "end": 2.2, "text": "This follows directly."},
        ]
        findings = audit(
            [(0.5, 1.65)], cues, thresholds=DEFAULT_THRESHOLDS,
            exemptions=[], plan=None,
        )
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["context"], "related_sentence")
        self.assertEqual(findings[0]["threshold_s"], 1.0)
        self.assertEqual(findings[0]["detected_silence_s"], 1.15)

    def test_inter_cue_timing_still_flags_noisy_pause(self) -> None:
        cues = [
            {"i": 1, "start": 0.0, "end": 0.5, "text": "One clause"},
            {"i": 2, "start": 1.3, "end": 2.0, "text": "continues here"},
        ]
        findings = audit(
            [], cues, thresholds=DEFAULT_THRESHOLDS, exemptions=[], plan=None
        )
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["context"], "continuation")
        self.assertEqual(findings[0]["detected_silence_s"], 0.0)

    def test_accepted_pause_exemption_is_retained_in_report(self) -> None:
        cues = [
            {"i": 1, "start": 0.0, "end": 0.5, "text": "First point."},
            {"i": 2, "start": 1.65, "end": 2.2, "text": "This follows directly."},
        ]
        findings = audit(
            [(0.5, 1.65)], cues, thresholds=DEFAULT_THRESHOLDS,
            exemptions=[{"start": 0.5, "end": 1.65, "reason": "reviewed emphasis"}],
            plan=None,
        )
        self.assertTrue(findings[0]["accepted"])
        self.assertEqual(findings[0]["acceptance_reason"], "reviewed emphasis")

    def test_section_default_does_not_make_normal_pause_breathless(self) -> None:
        cues = [
            {"i": 1, "start": 0.0, "end": 0.5, "text": "End section."},
            {"i": 2, "start": 1.8, "end": 2.2, "text": "New topic."},
        ]
        plan = {
            "segments": [
                {"output_end": 1.0, "join": "section"},
                {"output_end": 2.0, "join": "section"},
            ]
        }
        findings = audit(
            [(0.5, 1.8)], cues, thresholds=DEFAULT_THRESHOLDS,
            exemptions=[], plan=plan,
        )
        self.assertEqual(findings, [])
        ranges = finalize_ranges(
            [{"start": 1.0, "end": 2.0, "join": "section", "out": "section"}],
            pad_in=0.03, pad_out=0.05, merge_gap=0.15, src_dur=3.0,
        )
        self.assertEqual(ranges[0]["pad_out_applied"], 0.18)
        self.assertEqual(ranges[0]["join"], "section")


class BuildPlanTests(unittest.TestCase):
    def test_plan_preserves_join_pause_custom_audit_metadata_and_padding(self) -> None:
        ranges = finalize_ranges(
            [{
                "start": 1.0,
                "end": 2.0,
                "join": "sentence",
                "pause": {"intent": "retained", "accepted": True, "reason": "emphasis"},
                "in": "natural",
                "out": "soft",
                "pad_out": 0.09,
                "reviewer_note": "heard on preview",
            }],
            pad_in=0.03, pad_out=0.05, merge_gap=0.15, src_dur=3.0,
        )
        self.assertEqual(ranges[0]["join"], "sentence")
        self.assertTrue(ranges[0]["pause"]["accepted"])
        self.assertEqual(ranges[0]["pad_out_applied"], 0.09)
        self.assertEqual(ranges[0]["metadata"]["reviewer_note"], "heard on preview")
        mapped = map_accepted_pauses(
            [{"start": 1.2, "end": 1.8, "reason": "natural breath"}], ranges
        )
        self.assertEqual(len(mapped), 1)
        self.assertAlmostEqual(mapped[0]["end"] - mapped[0]["start"], 0.6, places=3)


class TightenEdgesTests(unittest.TestCase):
    def run_tighten(self, wav: Path, keeps: dict, directory: Path) -> tuple[dict, dict]:
        keep_path = directory / "keeps.json"
        output_path = directory / "tight.json"
        keep_path.write_text(json.dumps(keeps), encoding="utf-8")
        process = subprocess.run(
            [
                sys.executable, str(SCRIPTS / "tighten_edges.py"),
                "--keeps", str(keep_path), "--wav", str(wav),
                "--output", str(output_path),
            ],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(process.returncode, 0, process.stderr)
        return json.loads(process.stdout), json.loads(output_path.read_text(encoding="utf-8"))

    def test_desired_speech_quiet_short_prep_is_removed_at_section_cut(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            wav = directory / "audio.wav"
            write_wav(
                wav, 3.0,
                [(0.2, 1.0, 12000, 440), (1.3, 1.5, 9000, 700), (2.0, 2.5, 12000, 440)],
            )
            summary, output = self.run_tighten(
                wav,
                {"merge_gap": 0.15, "keeps": [
                    {"start": 0.2, "end": 1.5, "out": "section", "in": "natural"},
                    {"start": 2.0, "end": 2.5, "out": "section", "in": "natural"},
                ]},
                directory,
            )
            self.assertLess(output["keeps"][0]["end"], 1.1)
            self.assertIn("cut_adjacent_late_energy_after_quiet", {c["reason"] for c in summary["changes"]})
            self.assertTrue(summary["manual_listening_required"])

    def test_section_trailing_quiet_without_prep_is_not_compressed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            wav = directory / "audio.wav"
            write_wav(wav, 3.0, [(0.2, 0.9, 12000, 440), (2.0, 2.5, 12000, 440)])
            summary, output = self.run_tighten(
                wav,
                {"keeps": [
                    {"start": 0.2, "end": 1.5, "out": "section", "in": "natural"},
                    {"start": 2.0, "end": 2.5, "out": "section", "in": "natural"},
                ]},
                directory,
            )
            self.assertEqual(output["keeps"][0]["end"], 1.5)
            self.assertEqual(summary["change_count"], 0)


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg/ffprobe unavailable")
class ExtractJoinIntegrationTests(unittest.TestCase):
    def test_source_mode_excludes_deleted_marker_material(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            source = directory / "source.wav"
            write_wav(
                source, 3.0,
                [(0.0, 1.0, 10000, 440), (1.0, 2.0, 10000, 1000), (2.0, 3.0, 10000, 660)],
                sr=16000,
            )
            keeps = directory / "keeps.json"
            keeps.write_text(
                json.dumps({"keeps": [{"start": 0, "end": 1}, {"start": 2, "end": 3}]}),
                encoding="utf-8",
            )
            output_dir = directory / "joins"
            process = subprocess.run(
                [
                    sys.executable, str(SCRIPTS / "extract_joins.py"),
                    "--video", str(source), "--keeps", str(keeps),
                    "--out-dir", str(output_dir), "--pad", "0.5",
                ],
                text=True, capture_output=True, check=False,
            )
            self.assertEqual(process.returncode, 0, process.stderr)
            manifest = json.loads(process.stdout)
            self.assertEqual(manifest["timeline"], "source")
            self.assertEqual(manifest["clips"][0]["source_gap_excluded_s"], 1.0)
            with wave.open(str(output_dir / "join_000.wav"), "rb") as joined:
                sr = joined.getframerate()
                raw = joined.readframes(joined.getnframes())
            samples = list(struct.unpack("<" + "h" * (len(raw) // 2), raw))
            marker = spectral_power(samples, sr, 1000)
            retained = max(spectral_power(samples, sr, 440), spectral_power(samples, sr, 660))
            self.assertLess(marker, retained * 0.02)


if __name__ == "__main__":
    unittest.main()
