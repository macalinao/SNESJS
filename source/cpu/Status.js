var cpu_status_nmi_valid = false;
var cpu_status_nmi_line = false;
var cpu_status_nmi_transition = false;
var cpu_status_nmi_pending = false;

var cpu_status_irq_valid = false;
var cpu_status_irq_line = false;
var cpu_status_irq_transition = false;
var cpu_status_irq_pending = false;

var cpu_status_irq_lock = false;
var cpu_status_hdma_pending = false;

var cpu_status_wram_addr = 0;

var cpu_status_joypad_strobe_latch = false;

var cpu_status_nmi_enabled = false;
var cpu_status_virq_enabled = false;
var cpu_status_hirq_enabled = false;
var cpu_status_auto_joypad_poll_enabled = false;

var cpu_status_pio = 0;

var cpu_status_wrmpya = 0;
var cpu_status_wrmpyb = 0;
var cpu_status_wrdiva = 0;
var cpu_status_wrdivb = 0;

var cpu_status_htime = 0;
var cpu_status_vtime = 0;

var cpu_status_rom_speed = 0;

var cpu_status_rddiv = 0;
var cpu_status_rdmpy = 0;

var cpu_status_joy1l = 0
var cpu_status_joy1h = 0;
var cpu_status_joy2l = 0
var cpu_status_joy2h = 0;
var cpu_status_joy3l = 0
var cpu_status_joy3h = 0;
var cpu_status_joy4l = 0
var cpu_status_joy4h = 0;