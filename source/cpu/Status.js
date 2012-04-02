/*
 * This file is part of SNESJS.
 *
 * SNESJS is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SNESJS is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with SNESJS.  If not, see <http://www.gnu.org/licenses/>.
 */

SNESJS.CPU.Status = function() {

	this.nmi_valid = false;
	this.nmi_line = false;
	this.nmi_transition = false;
	this.nmi_pending = false;

	this.irq_valid = false;
	this.irq_line = false;
	this.irq_transition = false;
	this.irq_pending = false;

	this.irq_lock = false;
	this.hdma_pending = false;

	this.wram_addr = 0;

	this.joypad_strobe_latch = false;

	this.nmi_enabled = false;
	this.virq_enabled = false;
	this.hirq_enabled = false;
	this.auto_joypad_poll_enabled = false;

	this.pio = 0;

	this.wrmpya = 0;
	this.wrmpyb = 0;
	this.wrdiva = 0;
	this.wrdivb = 0;

	this.htime = 0;
	this.vtime = 0;

	this.rom_speed = 0;

	this.rddiv = 0;
	this.rdmpy = 0;

	this.joy1l = 0
	this.joy1h = 0;
	this.joy2l = 0
	this.joy2h = 0;
	this.joy3l = 0
	this.joy3h = 0;
	this.joy4l = 0
	this.joy4h = 0;

}