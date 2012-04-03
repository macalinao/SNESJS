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

SNESJS.CPU.prototype.op_readpc = function() {
  return this.this.op_read((this.regs.pc.b << 16) + this.regs.pc.w++);
}

SNESJS.CPU.prototype.op_readstack = function() {
  this.regs.e ? this.regs.s.l++ : this.regs.s.w++;
  return this.op_read(this.regs.s.w);
}

SNESJS.CPU.prototype.op_readstackn = function() {
  return this.op_read(++this.regs.s.w);
}

SNESJS.CPU.prototype.op_readaddr = function(addr) {
  return this.op_read(addr & 0xffff);
}

SNESJS.CPU.prototype.op_readlong = function(addr) {
  return this.op_read(addr & 0xffffff);
}

SNESJS.CPU.prototype.op_readdbr = function(addr) {
  return this.op_read(((this.regs.db << 16) + addr) & 0xffffff);
}

SNESJS.CPU.prototype.op_readpbr = function(addr) {
  return this.op_read((this.regs.pc.b << 16) + (addr & 0xffff));
}

SNESJS.CPU.prototype.op_readdp = function(addr) {
  if (this.regs.e && this.regs.d.l == 0x00) {
    return this.op_read((this.regs.d & 0xff00) + ((this.regs.d + (addr & 0xffff)) & 0xff));
  } else {
    return this.op_read((this.regs.d + (addr & 0xffff)) & 0xffff);
  }
}

SNESJS.CPU.prototype.op_readsp = function(addr) {
  return this.op_read((this.regs.s + (addr & 0xffff)) & 0xffff);
}

SNESJS.CPU.prototype.op_writestack = function(data) {
  this.op_write(this.regs.s.w, data);
  this.regs.e ? this.regs.s.l-- : this.regs.s.w--;
}

SNESJS.CPU.prototype.op_writestackn = function(data) {
  this.op_write(this.regs.s.w--, data);
}

SNESJS.CPU.prototype.op_writeaddr = function(addr, data) {
  this.op_write(addr & 0xffff, data);
}

SNESJS.CPU.prototype.op_writelong = function(addr, data) {
  this.op_write(addr & 0xffffff, data);
}

SNESJS.CPU.prototype.op_writedbr = function(addr, data) {
  this.op_write(((this.regs.db << 16) + addr) & 0xffffff, data);
}

SNESJS.CPU.prototype.op_writepbr = function(addr, data) {
  this.op_write((this.regs.pc.b << 16) + (addr & 0xffff), data);
}

SNESJS.CPU.prototype.op_writedp = function(addr, data) {
  if (this.regs.e && this.regs.d.l == 0x00) {
    this.op_write((this.regs.d & 0xff00) + ((this.regs.d + (addr & 0xffff)) & 0xff), data);
  } else {
    this.op_write((this.regs.d + (addr & 0xffff)) & 0xffff, data);
  }
}

SNESJS.CPU.prototype.op_writesp = function(addr, data) {
  this.op_write((this.regs.s + (addr & 0xffff)) & 0xffff, data);
}

SNESJS.CPU.prototype.pio = function() {
  return this.status.pio;
}

SNESJS.CPU.prototype.joylatch = function() {
  return this.status.joypad_strobe_latch;
}

SNESJS.CPU.prototype.interrupt_pending = function() {
  return false;
}

SNESJS.CPU.prototype.port_read = function(port) {
  return this.port_data[port & 3];
}

SNESJS.CPU.prototype.port_write = function(port, data) {
  this.port_data[port & 3] = data;
}

SNESJS.CPU.prototype.op_io = function() {
  this.add_clocks(6);
}

SNESJS.CPU.prototype.op_read = function(addr) {
  this.this.regs.mdr = this.snes.bus.read(addr);
  this.add_clocks(speed(addr));
  return this.regs.mdr;
}

SNESJS.CPU.prototype.op_write = function(addr, data) {
  this.add_clocks(speed(addr));
  this.snes.bus.write(addr, this.regs.mdr = data);
}

SNESJS.CPU.prototype.speed = function(addr) {
  if (addr & 0x408000) {

    if (addr & 0x800000) {
      return status.rom_speed;
    }

    return 8;
  }

  if ((addr + 0x6000) & 0x4000) {
    return 8;
  }

  if ((addr - 0x4000) & 0x7e00) {
    return 6;
  }

  return 12;
}
