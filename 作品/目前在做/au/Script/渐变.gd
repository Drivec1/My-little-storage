extends Sprite2D

# ================= 调色设置 =================
@export var color_speed: float = 60.0
var current_hue: float = 0.0

# ================= 移动设置 =================
@export var is_left_sprite: bool = true # 【关键】l勾选，r取消勾选
@export var move_speed: float = 200.0   
@export var start_x_offset: float = 0.0 # 【核心修改】改成0，紧贴屏幕边缘。如果觉得出来的太突然，可以改成10或20

var screen_width: float
var sprite_width: float
var other_sprite: Sprite2D 

func _ready() -> void:
	screen_width = get_viewport_rect().size.x
	if texture:
		sprite_width = texture.get_size().x * scale.x
	else:
		push_warning("请给角色设置 Texture！")
		
	# 获取同级里的另一个角色
	if is_left_sprite:
		other_sprite = get_parent().get_node_or_null("r")
		position.x = -sprite_width - start_x_offset 
	else:
		other_sprite = get_parent().get_node_or_null("l")
		position.x = screen_width + start_x_offset 

func _process(delta: float) -> void:
	# 1. 调色
	current_hue += color_speed * delta
	if current_hue >= 360.0:
		current_hue = 0.0
	modulate = Color.from_hsv(current_hue / 360.0, 0.62, 1.0)

	# 2. 移动
	if is_left_sprite:
		position.x += move_speed * delta # l 向右
	else:
		position.x -= move_speed * delta # r 向左

	# 3. 相撞检测
	if other_sprite and is_instance_valid(other_sprite):
		var distance = abs(position.x - other_sprite.position.x)
		
		# 如果碰到一起了
		if distance <= sprite_width: 
			# 同时重置两边
			reset_self()
			other_sprite.reset_self()

# 独立的重置函数
func reset_self() -> void:
	if is_left_sprite:
		position.x = -sprite_width - start_x_offset
	else:
		position.x = screen_width + start_x_offset
