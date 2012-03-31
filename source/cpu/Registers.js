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

SNESJS.CPU.Regs = function() {
	this.pc = new SNESJS.CPU.Reg24();

	this.p = new SNESJS.CPU.RegFlag();

	var rtemp = [];

	this.a = rtemp[0] = new SNESJS.CPU.Reg16();
	this.x = rtemp[1] = new SNESJS.CPU.Reg16();
	this.y = rtemp[2] = new SNESJS.CPU.Reg16();
	this.z = rtemp[3] = new SNESJS.CPU.Reg16();
	this.s = rtemp[4] = new SNESJS.CPU.Reg16();
	this.d = rtemp[5] = new SNESJS.CPU.Reg16();

	this.r = rtemp;

	this.db = 0;
	this.e = false;
	this.irq = false; //IRQ pin (0 = low, 1 = trigger)
	this.wai = false; //Raised during wai, cleared after interrupt triggered
	this.mdr = 0; //Memory data register

	this.z.d = 0;
}

SNESJS.CPU.RegFlag = function() {
	this.n = false;
	this.v = false;
	this.m = false;
	this.x = false;
	this.d = false;
	this.i = false;
	this.z = false;
	this.c = false;
}

SNESJS.CPU.RegFlag.prototype.assign = function(data) {
	this.n = (data & 0x80) == 0x80;
	this.v = (data & 0x40) == 0x40;
	this.m = (data & 0x20) == 0x20;
	this.x = (data & 0x10) == 0x10;
	this.d = (data & 0x08) == 0x08;
	this.i = (data & 0x04) == 0x04;
	this.z = (data & 0x02) == 0x02;
	this.c = (data & 0x01) == 0x01;
}

SNESJS.CPU.RegFlag.prototype.valueOf = function() {
	return (this.n ? 0x80 : 0x00)
		| (this.v ? 0x40 : 0x00)
		| (this.m ? 0x20 : 0x00)
		| (this.x ? 0x10 : 0x00)
		| (this.d ? 0x08 : 0x00)
		| (this.i ? 0x04 : 0x00)
		| (this.z ? 0x02 : 0x00)
		| (this.c ? 0x01 : 0x00);
}

SNESJS.CPU.Reg16 = function() {
	this.w = 0; //Value

	this.l = 0;
	this.h = 0;
}

SNESJS.CPU.Reg24 = function() {
	this.d = 0; //Value

	this.w = 0;
	this.wh = 0;

	this.l = 0;
	this.h = 0;
	this.b = 0;
	this.bh = 0;
}