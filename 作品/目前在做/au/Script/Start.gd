extends Node

@onready var animation_player = $动画控制台

var target_scene_path = "res://autoload/scenes_manager/scene_manager.tscn"
var is_animation_done = false
var trigger_time = 2.4  # ✅ 到达这个时间就算成功

func _ready():
	animation_player.play("RESET")  # 改成你的动画名

func _process(delta):
	# ✅ 检测动画是否到达 2.4 秒
	if not is_animation_done and animation_player.is_playing():
		if animation_player.current_animation_position >= trigger_time:
			is_animation_done = true
			print("动画到达 2.4 秒，已解锁")  # 可选，不想要可以删掉

func _input(event):
	if event.is_action_pressed("confirm"):
		if is_animation_done:
			print("跳转成功")
			get_tree().change_scene_to_file(target_scene_path)
		else:
			print("动画未播放跳转失败")
