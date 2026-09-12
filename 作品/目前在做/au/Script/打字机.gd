extends RichTextLabel

# ==================== 默认设置（在检查器里调） ====================
@export_group("打字机核心设置")
@export var 打字间隔: float = 0.05 

@export_group("字体与颜色设置")
@export var 字体路径: String = "res://fonts/MonsterFriendFore.otf"
@export var 字体大小: int = 16
@export var 默认颜色: Color = Color.WHITE
@export var 自定义颜色字符串: String = ""

@export_group("音效设置")
@export var 音效路径: String = "res://sounds/snd_wngdng7.wav"
@export var 音效音量: float = 1.0

# ==================== 运行时变量 ====================
var 待打印内容: String = ""
var 当前打印数量: int = 0
var 当前行数: int = 0
var _计时器: float = 0.0
var _正在打印: bool = false
var _音效播放器: AudioStreamPlayer
var _解析后的颜色列表: Array[Color] = []
var _纯文本长度: int = 0

signal 打字完成

func _ready():
	z_index = 4096
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	bbcode_enabled = true
	scroll_active = true
	scroll_following = true
	get_v_scroll_bar().visible = false # 隐藏拖动条
	
	# 如果没手动设置大小，给一个默认框，防止看不见字
	if size.x == 0 or size.y == 0:
		size = Vector2(800, 200)
		
	_音效播放器 = AudioStreamPlayer.new()
	add_child(_音效播放器)
	
	_应用字体设置()
	_应用音效设置()
	_解析颜色字符串()
	
	visible_characters = 0
	当前打印数量 = 0
	当前行数 = 1
	_正在打印 = false
	set_process(false)

func _应用字体设置():
	if 字体路径 != "" and ResourceLoader.exists(字体路径):
		var 加载的字体 = load(字体路径)
		if 加载的字体 is Font:
			add_theme_font_override("normal_font", 加载的字体)
			add_theme_font_size_override("normal_font_size", 字体大小)
	add_theme_color_override("default_color", 默认颜色)

func _应用音效设置():
	_音效播放器.volume_db = linear_to_db(音效音量)
	if 音效路径 != "" and ResourceLoader.exists(音效路径):
		var 加载的音效 = load(音效路径)
		if 加载的音效 is AudioStream:
			_音效播放器.stream = 加载的音效

func _解析颜色字符串():
	_解析后的颜色列表.clear()
	if 自定义颜色字符串.strip_edges() == "":
		return
	for 块 in 自定义颜色字符串.split("."):
		var 数值 = 块.split(",")
		if 数值.size() >= 3:
			_解析后的颜色列表.append(Color(float(数值[0])/255.0, float(数值[1])/255.0, float(数值[2])/255.0))

## 【核心接口】对外公开，外部通过这个传参
func 开始打印(新的内容: String, 动态配置: Dictionary = {}):
	# ==================== 【位置处理逻辑】 ====================
	var target_x = 动态配置.get("X", 0)
	var target_y = 动态配置.get("Y", 0)
	
	# 如果 X 和 Y 都是 0，自动居中
	if target_x == 0 and target_y == 0:
		var viewport_size = get_viewport_rect().size
		# 考虑到 RichTextLabel 的 size，确保它本身大小正常
		position = (viewport_size - size) / 2.0
		print("打字机位置：居中于 ", position ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
	else:
		position = Vector2(target_x, target_y)
		print("打字机位置：X=", target_x, " Y=", target_y ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
	# =========================================================

	# 如果传了配置，就覆盖默认值
	if 动态配置.has("打字间隔"): 打字间隔 = 动态配置["打字间隔"]
	if 动态配置.has("字体路径"): 字体路径 = 动态配置["字体路径"]
	if 动态配置.has("字体大小"): 字体大小 = 动态配置["字体大小"]
	if 动态配置.has("默认颜色"): 默认颜色 = 动态配置["默认颜色"]
	if 动态配置.has("自定义颜色字符串"): 自定义颜色字符串 = 动态配置["自定义颜色字符串"]
	if 动态配置.has("音效路径"): 音效路径 = 动态配置["音效路径"]
	if 动态配置.has("音效音量"): 音效音量 = 动态配置["音效音量"]
	
	_应用字体设置()
	_应用音效设置()
	_解析颜色字符串()
	
	待打印内容 = 新的内容
	_纯文本长度 = 待打印内容.length()
	var 构建好的文本 = ""
	var 颜色数量 = _解析后的颜色列表.size()
	
	for i in range(_纯文本长度):
		var 单个字符 = 待打印内容[i]
		var 当前颜色 = 默认颜色
		if 颜色数量 > 0:
			当前颜色 = _解析后的颜色列表[i % 颜色数量]
		构建好的文本 += "[color=#%s]%s[/color]" % [当前颜色.to_html(false), 单个字符]
	
	text = 构建好的文本
	visible_characters = 0   
	当前打印数量 = 0
	当前行数 = 1
	_计时器 = 0.0
	_正在打印 = true
	set_process(true)

func _process(delta):
	if not _正在打印: return
	_计时器 += delta
	if _计时器 >= 打字间隔:
		_计时器 -= 打字间隔 
		visible_characters += 1
		当前打印数量 = visible_characters
		当前行数 = get_line_count()
		if _音效播放器 and _音效播放器.stream != null:
			_音效播放器.play()
		if 当前打印数量 >= _纯文本长度:
			_正在打印 = false
			set_process(false)
			emit_signal("打字完成" ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
			print("打字机：打印完成！总字数：", 当前打印数量 ,"\n[" , Time.get_datetime_string_from_system() ,  "]")
