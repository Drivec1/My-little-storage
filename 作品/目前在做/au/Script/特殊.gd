extends AnimatedSprite2D

@export var 特殊动画: String = "new_up"
@export var 最短等待: float = 10.0
@export var 最长等待: float = 15.0

func _ready() -> void:
	# 如果一开始想先有个待机姿势，可以先播待机再停住
	# play("待机")
	# await animation_finished
	_循环播放特殊动画()

func _循环播放特殊动画() -> void:
	while true:
		await get_tree().create_timer(randf_range(最短等待, 最长等待)).timeout

		stop()          # 先停掉，防止停在最后一帧时 play 不重新开始
		play(特殊动画)
		await animation_finished
		# 这里什么都不做，就停在最后一帧
