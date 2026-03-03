# Raven（黒い鳥）ロゴ生成スクリプト
from PIL import Image, ImageDraw
import math

def draw_raven(draw, cx, cy, size, color=(0, 0, 0)):
    """黒い鳥（レイヴン）のシルエットを描画"""
    s = size / 100  # スケール

    # 体（楕円ベース）
    body_points = []
    for angle in range(360):
        rad = math.radians(angle)
        # 少し前傾した楕円
        rx = 28 * s
        ry = 22 * s
        x = cx + rx * math.cos(rad) - 5 * s
        y = cy + ry * math.sin(rad) + 5 * s
        body_points.append((x, y))
    draw.polygon(body_points, fill=color)

    # 頭（円）
    head_cx = cx - 22 * s
    head_cy = cy - 18 * s
    head_r = 16 * s
    draw.ellipse(
        [head_cx - head_r, head_cy - head_r, head_cx + head_r, head_cy + head_r],
        fill=color
    )

    # くちばし（三角形）- 鋭い
    beak = [
        (head_cx - 14 * s, head_cy - 6 * s),
        (head_cx - 38 * s, head_cy + 2 * s),
        (head_cx - 10 * s, head_cy + 4 * s),
    ]
    draw.polygon(beak, fill=color)

    # 翼（上部に広がる大きな弧）
    wing_points = [
        (cx - 10 * s, cy),
        (cx + 5 * s, cy - 30 * s),
        (cx + 25 * s, cy - 42 * s),
        (cx + 40 * s, cy - 38 * s),
        (cx + 48 * s, cy - 28 * s),
        (cx + 42 * s, cy - 18 * s),
        (cx + 32 * s, cy - 10 * s),
        (cx + 20 * s, cy - 5 * s),
        (cx + 10 * s, cy + 2 * s),
    ]
    draw.polygon(wing_points, fill=color)

    # 翼の羽先（ギザギザ感）
    feather_tips = [
        (cx + 40 * s, cy - 38 * s),
        (cx + 52 * s, cy - 35 * s),
        (cx + 48 * s, cy - 28 * s),
        (cx + 55 * s, cy - 24 * s),
        (cx + 42 * s, cy - 18 * s),
        (cx + 48 * s, cy - 12 * s),
        (cx + 32 * s, cy - 10 * s),
    ]
    draw.polygon(feather_tips, fill=color)

    # 尾（後方に伸びる）
    tail = [
        (cx + 20 * s, cy + 8 * s),
        (cx + 38 * s, cy + 18 * s),
        (cx + 45 * s, cy + 22 * s),
        (cx + 40 * s, cy + 28 * s),
        (cx + 32 * s, cy + 24 * s),
        (cx + 25 * s, cy + 20 * s),
        (cx + 15 * s, cy + 15 * s),
    ]
    draw.polygon(tail, fill=color)

    # 目（小さな白い点）
    eye_cx = head_cx - 6 * s
    eye_cy = head_cy - 3 * s
    eye_r = 2.5 * s
    draw.ellipse(
        [eye_cx - eye_r, eye_cy - eye_r, eye_cx + eye_r, eye_cy + eye_r],
        fill=(255, 255, 255)
    )
    # 瞳
    pupil_r = 1.2 * s
    draw.ellipse(
        [eye_cx - pupil_r, eye_cy - pupil_r, eye_cx + pupil_r, eye_cy + pupil_r],
        fill=color
    )


def create_icon(output_path, img_size, bg_color, bird_size, offset_y=0):
    img = Image.new("RGBA", (img_size, img_size), bg_color)
    draw = ImageDraw.Draw(img)
    cx = img_size // 2 + int(img_size * 0.02)
    cy = img_size // 2 + offset_y
    draw_raven(draw, cx, cy, bird_size, color=(15, 15, 15))
    img.save(output_path, "PNG")
    print(f"生成: {output_path}")


# アプリアイコン (1024x1024) - ダークブルー背景
create_icon(
    "C:/Users/user/sns-app/assets/icon.png",
    img_size=1024, bg_color=(29, 155, 240, 255),
    bird_size=500, offset_y=-20
)

# Adaptive Icon (1024x1024) - 透明背景
create_icon(
    "C:/Users/user/sns-app/assets/adaptive-icon.png",
    img_size=1024, bg_color=(29, 155, 240, 255),
    bird_size=420, offset_y=-10
)

# スプラッシュアイコン (200x200)
create_icon(
    "C:/Users/user/sns-app/assets/splash-icon.png",
    img_size=200, bg_color=(0, 0, 0, 0),
    bird_size=120, offset_y=-5
)

# Favicon (48x48)
create_icon(
    "C:/Users/user/sns-app/assets/favicon.png",
    img_size=48, bg_color=(0, 0, 0, 0),
    bird_size=30, offset_y=-1
)

print("全ロゴ生成完了！")
