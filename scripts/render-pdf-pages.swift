// Renders every page of a PDF to PNG with CoreGraphics (macOS, no extra tools).
// usage: swift scripts/render-pdf-pages.swift <in.pdf> <out-prefix> [scale]
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: render-pdf-pages <in.pdf> <out-prefix> [scale]"); exit(1) }
let scale = CGFloat(args.count > 3 ? (Double(args[3]) ?? 2.0) : 2.0)
guard let doc = CGPDFDocument(URL(fileURLWithPath: args[1]) as CFURL) else { print("cannot open \(args[1])"); exit(1) }
for i in 1...doc.numberOfPages {
  guard let page = doc.page(at: i) else { continue }
  let box = page.getBoxRect(.mediaBox)
  let w = Int(box.width * scale), h = Int(box.height * scale)
  guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { continue }
  ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
  ctx.scaleBy(x: scale, y: scale)
  ctx.translateBy(x: -box.origin.x, y: -box.origin.y)
  ctx.drawPDFPage(page)
  guard let img = ctx.makeImage() else { continue }
  let out = URL(fileURLWithPath: "\(args[2])-p\(i).png")
  guard let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil) else { continue }
  CGImageDestinationAddImage(dest, img, nil)
  CGImageDestinationFinalize(dest)
  print(out.path)
}
