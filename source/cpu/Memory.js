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
  this.regs.mdr = this.snes.bus.read(addr);
  this.add_clocks(speed(addr));
  return regs.mdr;
}

SNESJS.CPU.prototype.op_write = function(addr, data) {
  this.add_clocks(speed(addr));
  this.snes.bus.write(addr, regs.mdr = data);
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
