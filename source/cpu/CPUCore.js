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

SNESJS.CPU.prototype.op_io_irq = function() {
	if (interrupt_pending()) {
		//modify I/O cycle to bus read cycle, do not increment PC
		this.op_read(this.regs.pc.d);
	} else {
		this.op_io();
	}
}

SNESJS.CPU.prototype.op_io_cond2 = function() {
	if (this.regs.d.l != 0x00) {
		this.op_io();
	}
}

SNESJS.CPU.prototype.op_io_cond4 = function(x, y) {
	if (!this.regs.p.x || (x & 0xff00) != (y & 0xff00)) {
		this.op_io();
	}
}

SNESJS.CPU.prototype.op_io_cond6 = function(addr) {
	if (this.regs.e && (this.regs.pc.w & 0xff00) != (addr & 0xff00)) {
		this.op_io();
	}
}

SNESJS.CPU.prototype.op_irq = function() {
  this.op_read(this.regs.pc.d);
  this.op_io();

  if(!this.regs.e) {
  	this.op_writestack(this.regs.pc.b);
  }

  this.op_writestack(this.regs.pc.h);
  this.op_writestack(this.regs.pc.l);
  this.op_writestack(this.regs.e ? (this.regs.p & ~0x10) : this.regs.p);
  this.rd.l = this.op_read(this.regs.vector + 0);
  this.regs.pc.b = 0x00;
  this.regs.p.i  = 1;
  this.regs.p.d  = 0;
  this.rd.h = this.op_read(this.regs.vector + 1);
  this.regs.pc.w = this.rd.w;
}

