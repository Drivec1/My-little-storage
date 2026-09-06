extends Node   # 自动加载单例专用，一定要写 Node

func _input(event: InputEvent):
	# 检测按下 F4
	if event is InputEventKey and event.pressed and event.keycode == KEY_F4:
		toggle_screen_mode()

func toggle_screen_mode():
	# 获取当前窗口模式
	var current_mode = DisplayServer.window_get_mode()
	
	# 如果当前是全屏，就切换成窗口；否则切换成全屏
	if current_mode == DisplayServer.WINDOW_MODE_FULLSCREEN:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
