extends Node2D

# ===== 导出变量 =====
@export var target_position: Vector2 = Vector2(34, -3)   # 自定义落点
@export var duration: float = 5                       # 总时长（秒）
@export var clockwise: bool = true                      # 旋转方向
@export var acceleration_power: float = 1.5            # 加速指数（>1 越近越快）

# 内部变量
var start_radius: float
var start_angle: float
var end_radius: float
var end_angle: float
var total_rotation: float
var direction: int

func _ready():
	await get_tree().create_timer(1.0).timeout
	start_motion()

func start_motion():
	var start_pos = position
	start_angle = start_pos.angle()
	start_radius = start_pos.length()

	var end_pos = target_position
	end_angle = end_pos.angle()
	end_radius = end_pos.length()

	# 计算必须转满一整圈的总角度
	if clockwise:
		direction = 1
		var delta = end_angle - start_angle
		if delta <= 0:
			delta += 2 * PI
		total_rotation = delta + 2 * PI
	else:
		direction = -1
		var delta = start_angle - end_angle
		if delta <= 0:
			delta += 2 * PI
		total_rotation = delta + 2 * PI

	# 使用 Tween 驱动
	var tween = create_tween()
	tween.tween_method(update_position, 0.0, 1.0, duration)
	tween.finished.connect(func(): position = target_position)

func update_position(progress: float):
	# 🔥 核心改动：将线性进度映射为非线性（加速）
	var t = pow(progress, acceleration_power)
	
	# 半径和角度都使用非线性 t 进行插值
	var current_radius = lerp(start_radius, end_radius, t)
	var current_angle = start_angle + direction * total_rotation * t

	position = Vector2(current_radius * cos(current_angle), current_radius * sin(current_angle))
