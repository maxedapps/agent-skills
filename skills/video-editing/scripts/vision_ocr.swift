#!/usr/bin/env swift
import Foundation
import ImageIO
import Vision

struct Observation: Codable {
    let text: String
    let confidence: Float
    let rect: [Double] // normalized top-left x,y,w,h
}

struct Result: Codable {
    let image: String
    let observations: [Observation]
}

func usage() {
    print("""
Usage: vision_ocr.swift [options] <image> [image ...]

Options:
  --language CODE       Recognition language; default en-US
  --min-height FLOAT    Minimum normalized text height; default 0.004
  --fast                Use fast rather than accurate recognition
  -h, --help            Show help

Writes one compact JSON object per image to stdout. Rectangles are normalized
TOP-LEFT [x,y,width,height]. Diagnostics go to stderr. Exit 0 success, 2 usage,
3 image/OCR failure. Apple Vision runs locally and requires macOS.
""")
}

var language = "en-US"
var minimumHeight: Float = 0.004
var accurate = true
var images: [String] = []
var index = 1
let args = CommandLine.arguments
while index < args.count {
    let arg = args[index]
    switch arg {
    case "-h", "--help":
        usage(); exit(0)
    case "--fast":
        accurate = false; index += 1
    case "--language":
        guard index + 1 < args.count else { fputs("error: --language needs a value\n", stderr); exit(2) }
        language = args[index + 1]; index += 2
    case "--min-height":
        guard index + 1 < args.count, let value = Float(args[index + 1]), value >= 0 else {
            fputs("error: --min-height needs a non-negative number\n", stderr); exit(2)
        }
        minimumHeight = value; index += 2
    default:
        if arg.hasPrefix("-") { fputs("error: unknown option \(arg)\n", stderr); exit(2) }
        images.append(arg); index += 1
    }
}
if images.isEmpty { fputs("error: at least one image is required\n", stderr); usage(); exit(2) }

let encoder = JSONEncoder()
encoder.outputFormatting = [.withoutEscapingSlashes]
var failed = false
for path in images {
    let url = URL(fileURLWithPath: path) as CFURL
    guard let source = CGImageSourceCreateWithURL(url, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        fputs("error: could not load \(path)\n", stderr); failed = true; continue
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = accurate ? .accurate : .fast
    request.usesLanguageCorrection = true
    request.recognitionLanguages = [language]
    request.minimumTextHeight = minimumHeight
    do {
        try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
        let observations = (request.results ?? []).compactMap { item -> Observation? in
            guard let candidate = item.topCandidates(1).first else { return nil }
            let box = item.boundingBox
            return Observation(
                text: candidate.string,
                confidence: candidate.confidence,
                rect: [box.minX, 1.0 - box.maxY, box.width, box.height]
            )
        }.sorted { a, b in
            abs(a.rect[1] - b.rect[1]) > 0.01 ? a.rect[1] < b.rect[1] : a.rect[0] < b.rect[0]
        }
        let data = try encoder.encode(Result(image: path, observations: observations))
        print(String(decoding: data, as: UTF8.self))
    } catch {
        fputs("error: OCR failed for \(path): \(error)\n", stderr); failed = true
    }
}
exit(failed ? 3 : 0)
