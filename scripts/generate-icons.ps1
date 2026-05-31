param(
  [string]$OutputDir = "icons"
)

Add-Type -AssemblyName System.Drawing

$root = Resolve-Path "."
$target = Join-Path $root $OutputDir
if (-not (Test-Path -LiteralPath $target)) {
  New-Item -ItemType Directory -Path $target | Out-Null
}

function New-Icon {
  param(
    [int]$Size,
    [string]$IconPath,
    [bool]$Maskable = $false,
    [bool]$Badge = $false
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(246, 243, 236))

  $rect = New-Object System.Drawing.RectangleF 0, 0, $Size, $Size
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(24, 154, 172),
    [System.Drawing.Color]::FromArgb(222, 73, 97),
    30
  )
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend 5
  $blend.Colors = @(
    [System.Drawing.Color]::FromArgb(38, 177, 196),
    [System.Drawing.Color]::FromArgb(69, 196, 122),
    [System.Drawing.Color]::FromArgb(246, 196, 63),
    [System.Drawing.Color]::FromArgb(229, 89, 93),
    [System.Drawing.Color]::FromArgb(112, 88, 178)
  )
  $blend.Positions = @(0.0, 0.28, 0.52, 0.76, 1.0)
  $brush.InterpolationColors = $blend
  $corner = if ($Maskable) { [int]($Size * 0.22) } else { [int]($Size * 0.28) }
  $pad = if ($Maskable) { [int]($Size * 0.08) } else { [int]($Size * 0.04) }
  $bgRect = New-Object System.Drawing.Rectangle ($pad), ($pad), ($Size - ($pad * 2)), ($Size - ($pad * 2))
  $shapePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $corner * 2
  $shapePath.AddArc($bgRect.X, $bgRect.Y, $diameter, $diameter, 180, 90)
  $shapePath.AddArc($bgRect.Right - $diameter, $bgRect.Y, $diameter, $diameter, 270, 90)
  $shapePath.AddArc($bgRect.Right - $diameter, $bgRect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $shapePath.AddArc($bgRect.X, $bgRect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $shapePath.CloseFigure()
  $graphics.FillPath($brush, $shapePath)
  $graphics.SetClip($shapePath)

  $glowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(120, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
    90
  )
  $graphics.FillEllipse($glowBrush, -($Size * 0.12), -($Size * 0.24), $Size * 1.1, $Size * 0.8)

  $ribbonBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(42, 255, 255, 255))
  $ribbonPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $ribbonPath.AddBezier($Size * -0.08, $Size * 0.80, $Size * 0.28, $Size * 0.54, $Size * 0.64, $Size * 0.90, $Size * 1.08, $Size * 0.58)
  $ribbonPen = New-Object System.Drawing.Pen $ribbonBrush, ([Math]::Max(8, $Size * 0.09))
  $ribbonPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $ribbonPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawPath($ribbonPen, $ribbonPath)
  $graphics.ResetClip()

  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 253, 248))

  if ($Badge) {
    $badgeShadowPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 24, 35, 40)), ([Math]::Max(7, $Size * 0.12))
    $badgeShadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $badgeShadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $badgePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 253, 248)), ([Math]::Max(5, $Size * 0.09))
    $badgePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $badgePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($badgeShadowPen, $Size * 0.27, $Size * 0.54, $Size * 0.44, $Size * 0.70)
    $graphics.DrawLine($badgeShadowPen, $Size * 0.44, $Size * 0.70, $Size * 0.76, $Size * 0.34)
    $graphics.DrawLine($badgePen, $Size * 0.25, $Size * 0.51, $Size * 0.43, $Size * 0.67)
    $graphics.DrawLine($badgePen, $Size * 0.43, $Size * 0.67, $Size * 0.75, $Size * 0.31)
  } else {
    $checkPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $checkPath.AddBezier($Size * 0.20, $Size * 0.54, $Size * 0.28, $Size * 0.62, $Size * 0.34, $Size * 0.70, $Size * 0.43, $Size * 0.77)
    $checkPath.AddBezier($Size * 0.43, $Size * 0.77, $Size * 0.56, $Size * 0.54, $Size * 0.68, $Size * 0.37, $Size * 0.83, $Size * 0.22)

    $shadowPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(105, 20, 28, 34)), ([Math]::Max(12, $Size * 0.12))
    $shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $shadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $shadowMatrix = New-Object System.Drawing.Drawing2D.Matrix
    $shadowMatrix.Translate($Size * 0.018, $Size * 0.024)
    $shadowPath = $checkPath.Clone()
    $shadowPath.Transform($shadowMatrix)
    $graphics.DrawPath($shadowPen, $shadowPath)

    $checkPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 253, 248)), ([Math]::Max(10, $Size * 0.088))
    $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $checkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($checkPen, $checkPath)

    $highlightPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(135, 255, 255, 255)), ([Math]::Max(3, $Size * 0.022))
    $highlightPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $highlightPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawPath($highlightPen, $checkPath)
  }

  $bitmap.Save($IconPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $shapePath.Dispose()
  $bitmap.Dispose()
}

New-Icon -Size 180 -IconPath (Join-Path $target "apple-touch-icon.png")
New-Icon -Size 192 -IconPath (Join-Path $target "icon-192.png")
New-Icon -Size 512 -IconPath (Join-Path $target "icon-512.png")
New-Icon -Size 512 -IconPath (Join-Path $target "maskable-512.png") -Maskable $true
New-Icon -Size 96 -IconPath (Join-Path $target "badge-96.png") -Badge $true
