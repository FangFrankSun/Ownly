import AppKit

struct Palette {
  static let navy = NSColor(calibratedRed: 32/255, green: 56/255, blue: 107/255, alpha: 1)
  static let navyDark = NSColor(calibratedRed: 28/255, green: 48/255, blue: 94/255, alpha: 1)
  static let blueTop = NSColor(calibratedRed: 166/255, green: 205/255, blue: 255/255, alpha: 1)
  static let blueBottom = NSColor(calibratedRed: 111/255, green: 164/255, blue: 247/255, alpha: 1)
  static let bg = NSColor.white
  static let bgSoft = NSColor(calibratedRed: 245/255, green: 248/255, blue: 255/255, alpha: 1)
}

let root = URL(fileURLWithPath: "/Users/fangsun/Documents/Applications/Ownly")
let assets = root.appendingPathComponent("assets/images")
let appIcon = root.appendingPathComponent("ios/Ownly/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png")
let dist = root.appendingPathComponent("dist")

func starPath(center: CGPoint, outerRadius: CGFloat, innerRadius: CGFloat, points: Int = 5) -> NSBezierPath {
  let path = NSBezierPath()
  for index in 0..<(points * 2) {
    let angle = -CGFloat.pi / 2 + CGFloat(index) * CGFloat.pi / CGFloat(points)
    let radius = index.isMultiple(of: 2) ? outerRadius : innerRadius
    let point = CGPoint(x: center.x + cos(angle) * radius, y: center.y + sin(angle) * radius)
    if index == 0 { path.move(to: point) } else { path.line(to: point) }
  }
  path.close()
  return path
}

func roundedRectPath(_ rect: CGRect, radius: CGFloat) -> NSBezierPath {
  NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
}

func drawGradient(in path: NSBezierPath, top: NSColor, bottom: NSColor, angle: CGFloat = -90) {
  path.addClip()
  let gradient = NSGradient(starting: top, ending: bottom)!
  gradient.draw(in: path, angle: angle)
}

func save(_ image: NSImage, to url: URL) throws {
  let rep = NSBitmapImageRep(data: image.tiffRepresentation!)!
  let data = rep.representation(using: .png, properties: [:])!
  try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  try data.write(to: url)
}

func renderLogo(size: CGFloat, transparent: Bool = false, stars: Bool = true, monochrome: Bool = false) -> NSImage {
  let image = NSImage(size: NSSize(width: size, height: size))
  image.lockFocus()
  defer { image.unlockFocus() }

  let rect = CGRect(x: 0, y: 0, width: size, height: size)
  if !transparent {
    (monochrome ? Palette.bgSoft : Palette.bg).setFill()
    rect.fill()
  }

  func scale(_ value: CGFloat) -> CGFloat { value / 1024 * size }

  let stroke = monochrome ? Palette.navyDark : Palette.navy

  if stars {
    stroke.setFill()
    [(110.0, 260.0, 16.0), (135.0, 735.0, 20.0), (218.0, 905.0, 12.0), (792.0, 168.0, 12.0), (900.0, 287.0, 16.0), (850.0, 775.0, 15.0)].forEach { x, y, r in
      NSBezierPath(ovalIn: CGRect(x: scale(x-r), y: scale(y-r), width: scale(r*2), height: scale(r*2))).fill()
    }
    [(168.0, 182.0, 28.0, 12.0), (892.0, 232.0, 24.0, 10.0), (816.0, 876.0, 22.0, 9.0), (118.0, 516.0, 18.0, 8.0)].forEach { x, y, ro, ri in
      starPath(center: CGPoint(x: scale(x), y: scale(y)), outerRadius: scale(ro), innerRadius: scale(ri)).fill()
    }
  }

  let backRect = CGRect(x: scale(360), y: scale(120), width: scale(465), height: scale(610))
  let backPath = roundedRectPath(backRect, radius: scale(70))
  (monochrome ? NSColor(calibratedWhite: 0.97, alpha: 1) : .white).setFill()
  backPath.fill()
  stroke.setStroke()
  backPath.lineWidth = scale(22)
  backPath.stroke()

  let frontRect = CGRect(x: scale(190), y: scale(210), width: scale(460), height: scale(565))
  let frontPath = roundedRectPath(frontRect, radius: scale(70))
  if monochrome {
    NSColor(calibratedRed: 186/255, green: 206/255, blue: 236/255, alpha: 1).setFill()
    frontPath.fill()
  } else {
    drawGradient(in: frontPath, top: Palette.blueTop, bottom: Palette.blueBottom)
  }
  stroke.setStroke()
  frontPath.lineWidth = scale(22)
  frontPath.stroke()

  let fold = NSBezierPath()
  fold.move(to: CGPoint(x: scale(620), y: scale(465)))
  fold.line(to: CGPoint(x: scale(620), y: scale(330)))
  fold.line(to: CGPoint(x: scale(745), y: scale(465)))
  fold.close()
  if monochrome {
    NSColor(calibratedWhite: 0.95, alpha: 1).setFill()
    fold.fill()
  } else {
    drawGradient(in: fold, top: .white, bottom: NSColor(calibratedRed: 230/255, green: 240/255, blue: 255/255, alpha: 1))
  }
  stroke.setStroke()
  fold.lineWidth = scale(18)
  fold.stroke()

  let shadowPath = NSBezierPath()
  shadowPath.move(to: CGPoint(x: scale(430), y: scale(700)))
  shadowPath.line(to: CGPoint(x: scale(330), y: scale(600)))
  shadowPath.line(to: CGPoint(x: scale(285), y: scale(645)))
  shadowPath.line(to: CGPoint(x: scale(430), y: scale(790)))
  shadowPath.line(to: CGPoint(x: scale(845), y: scale(376)))
  shadowPath.line(to: CGPoint(x: scale(800), y: scale(332)))
  shadowPath.lineJoinStyle = .round
  shadowPath.lineCapStyle = .round
  shadowPath.lineWidth = scale(130)
  NSGraphicsContext.saveGraphicsState()
  let shadow = NSShadow()
  shadow.shadowBlurRadius = scale(12)
  shadow.shadowOffset = NSSize(width: scale(4), height: scale(-10))
  shadow.shadowColor = NSColor(calibratedRed: 18/255, green: 39/255, blue: 82/255, alpha: 0.20)
  shadow.set()
  NSColor(calibratedWhite: 0, alpha: 0.001).setStroke()
  shadowPath.stroke()
  NSGraphicsContext.restoreGraphicsState()

  let checkPath = NSBezierPath()
  checkPath.move(to: CGPoint(x: scale(430), y: scale(700)))
  checkPath.line(to: CGPoint(x: scale(330), y: scale(600)))
  checkPath.line(to: CGPoint(x: scale(285), y: scale(645)))
  checkPath.line(to: CGPoint(x: scale(430), y: scale(790)))
  checkPath.line(to: CGPoint(x: scale(845), y: scale(376)))
  checkPath.line(to: CGPoint(x: scale(800), y: scale(332)))
  checkPath.lineJoinStyle = .round
  checkPath.lineCapStyle = .round
  checkPath.lineWidth = scale(118)
  if monochrome {
    NSColor(calibratedRed: 145/255, green: 188/255, blue: 255/255, alpha: 1).setStroke()
    checkPath.stroke()
  } else {
    drawGradient(in: checkPath.copy() as! NSBezierPath, top: Palette.blueTop, bottom: Palette.blueBottom)
    checkPath.stroke()
  }
  stroke.setStroke()
  checkPath.lineWidth = scale(24)
  checkPath.stroke()

  return image
}

let fm = FileManager.default
try? fm.createDirectory(at: assets, withIntermediateDirectories: true)

let main = renderLogo(size: 1024)
let transparent = renderLogo(size: 1024, transparent: true)
let foreground = renderLogo(size: 1024, transparent: true, stars: false)
let mono = renderLogo(size: 1024, transparent: true, stars: false, monochrome: true)
let bg = NSImage(size: NSSize(width: 1024, height: 1024))
bg.lockFocus(); Palette.bgSoft.setFill(); CGRect(x:0,y:0,width:1024,height:1024).fill(); bg.unlockFocus()

try save(main, to: assets.appendingPathComponent("ownly-ios-app-icon-1024.png"))
try save(main, to: assets.appendingPathComponent("ownly-meta-icon-1024.png"))
try save(transparent, to: assets.appendingPathComponent("ownly-meta-icon-transparent-1024.png"))
try save(main, to: assets.appendingPathComponent("icon.png"))
try save(main, to: assets.appendingPathComponent("splash-icon.png"))
try save(main, to: assets.appendingPathComponent("favicon.png"))
try save(foreground, to: assets.appendingPathComponent("android-icon-foreground.png"))
try save(bg, to: assets.appendingPathComponent("android-icon-background.png"))
try save(mono, to: assets.appendingPathComponent("android-icon-monochrome.png"))
try save(main, to: appIcon)
if fm.fileExists(atPath: dist.path) {
  try save(main, to: dist.appendingPathComponent("favicon.png"))
}
print("Generated Ownly brand assets")
