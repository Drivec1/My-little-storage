extends Sprite2D # 如果“决心”是 Node2D，请改成 extends Node2D

# 目标坐标
@export var 目标X: float = 50
@export var 目标Y: float = 235

# 移动速度（像素/秒），可以在检查器面板调整
@export var 移动速度: float = 200.0

# 获取“游玩字体”节点
@onready var 游玩字体 = $"../游玩字体"

# 记录上一帧是否在目标位置，防止每帧重复改颜色
var _上次是否在目标: bool = false

func _ready():
	_更新颜色()

func _process(delta):
	# ==================== 移动逻辑 ====================
	# 获取方向输入（左、右、上、下）
	var 方向 = Input.get_vector("left", "right", "up", "down")
	# 将方向乘以速度和时间增量，实现平滑移动
	position += 方向 * 移动速度 * delta
	# ==================================================

	# ==================== 颜色判断逻辑 ====================
	var 距离 = position.distance_to(Vector2(目标X, 目标Y))
	var 在目标 = 距离 < 5.0 # 只要距离小于 5 像素就算到达
	
	if 在目标 != _上次是否在目标:
		_上次是否在目标 = 在目标
		_更新颜色()

func _更新颜色():
	var 距离 = position.distance_to(Vector2(目标X, 目标Y))
	if 距离 < 5.0:
		# 在目标位置：黄绿色 (242, 244, 52)
		游玩字体.add_theme_color_override("font_color", Color8(242, 244, 52))
	else:
		# 不在目标位置：白色 (242, 244, 255)
		游玩字体.add_theme_color_override("font_color", Color8(242, 244, 255))
