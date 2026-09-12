extends Control

# 你的动画控制台节点
@onready var animation_player = $动画控制台

# 你要跳转的目标场景路径
var target_scene_path = "res://autoload/scenes_manager/scene_manager.tscn" 
# 目标解锁时间（秒）
var can_jump_time: float = 2.4 
# 记录当前经过的时间
var elapsed_time: float = 0.0 
# 记录是否处于“卡住等待加载”状态
var is_waiting_load: bool = false

# 用于防止日志每帧重复打印的标记
var has_printed_time_reached: bool = false
var has_printed_res_loaded: bool = false

func _ready():
	# 1. 游戏被打开（场景加载）时，立刻运行 RESET 动画
	if animation_player:
		animation_player.play("RESET")
	
	# 2. 进入主界面，立刻发起后台预加载
	ResourceLoader.load_threaded_request(target_scene_path)
	
	# 3. 关键设置：让当前节点即使在游戏暂停时也能继续运行
	process_mode = Node.PROCESS_MODE_ALWAYS

func _process(delta):
	# 时间累加
	elapsed_time += delta
	
	# 检测是否到达 2.4 秒，到达时打印一次“时间到了”
	if not has_printed_time_reached and elapsed_time >= can_jump_time:
		has_printed_time_reached = true
		print("动画到达 2.4 秒" ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
		
	# 检测资源是否加载好了，加载好时打印一次“资源加载好了”
	if not has_printed_res_loaded:
		var status = ResourceLoader.load_threaded_get_status(target_scene_path)
		if status == ResourceLoader.THREAD_LOAD_LOADED:
			has_printed_res_loaded = true
			print("资源加载好了" ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
	
	# 处理“卡住静默加载”的逻辑
	if is_waiting_load:
		var status = ResourceLoader.load_threaded_get_status(target_scene_path)
		if status == ResourceLoader.THREAD_LOAD_LOADED:
			is_waiting_load = false
			get_tree().paused = false # 解除暂停，恢复所有脚本
			print("等待结束" ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
			jump_to_scene()

func _input(event):
	# 【核心修改】监听输入映射中名为 "confirm" 的动作（你绑定的 Z 键或 Enter 键）
	if event.is_action_pressed("confirm"):
		
		if is_waiting_load:
			return
			
		# 【时间锁判定】时间没到 2.4 秒，绝对不触发跳转
		if elapsed_time < can_jump_time:
			print("跳转失败" ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
			return
			
		# 时间达标了
		print("转换成功" ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
		
		var status = ResourceLoader.load_threaded_get_status(target_scene_path)
		if status == ResourceLoader.THREAD_LOAD_LOADED:
			jump_to_scene()
		else:
			print("后台静默加载中" ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
			lock_and_wait()

func lock_and_wait():
	is_waiting_load = true
	get_tree().paused = true

func jump_to_scene():
	var next_scene = ResourceLoader.load_threaded_get(target_scene_path)
	get_tree().change_scene_to_packed(next_scene)
