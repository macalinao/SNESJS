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

SNESJS.Bus = function() {
  this.lookup = [];
  this.target = [];
}

SNESJS.Bus.prototype.mirror = function(addr, size) {
  var base = 0;
  if (size) {

    var mask = 1 << 23;

    while (addr >= size) {
      while (!(addr & mask)) mask >>= 1;
      addr -= mask;
      if (size > mask) {
        size -= mask;
        base += mask;
      }
      mask >>= 1;
    }

    base += addr;

  }
  return base;
}

SNESJS.Bus.prototype.map = function(addr, access, offset) {
  var p = this.page[addr >> 8];
  p.access = access;
  p.offset = offset - addr;
}


SNESJS.Bus.prototype.map = function(mode, bank_lo, bank_hi, addr_lo, addr_hi, rd, wr, base, length) {

  var id = idcount++;
  this.reader[id] = rd;
  this.writer[id] = wr;

  if (length == 0) {
    length = (bank_hi - bank_lo + 1) * (addr_hi - addr_lo + 1);
  }

  var offset = 0;
  for (var bank = bank_lo; bank <= bank_hi; bank++) {
    for (var addr = addr_lo; addr <= addr_hi; addr++) {
      var destaddr = (bank << 16) | addr;

      if (mode == SNESJS.Bus.MapMode.Linear) {
        destaddr = this.mirror(base + offset++, length);
      }

      if (mode == SNESJS.Bus.MapMode.Shadow) {
        destaddr = this.mirror(base + destaddr, length);
      }

      this.lookup[(bank << 16) | addr] = id;
      this.target[(bank << 16) | addr] = destaddr;
    }
  }
}

SNESJS.Bus.bus_reader_dummy = function(cpu, thing) {
  return cpu.regs.mdr;
}

SNESJS.Bus.bus_writer_dummy = function(cpu, thing, byte) {}

SNESJS.Bus.prototype.map_reset = function() {
  for (var i = 0; i < 0x100; i++) {
    this.reader[i] = SNESJS.Bus.bus_reader_dummy;
  }

  for (var i = 0; i < 0x100; i++) {
    this.writer[i] = SNESJS.Bus.bus_writer_dummy;
  }

  idcount = 0;
  this.map(SNESJS.Bus.MapMode.Direct, 0x00, 0xff, 0x0000, 0xffff, this.reader, this.writer);
}

SNESJS.Bus.prototype.map_xml = function() {
  for (var i = 0; i < this.snes.cartridge.mapping.length, i++) {
    var m = this.snes.cartridge.mapping[i];
    map(m.mode.i, m.banklo, m.bankhi, m.addrlo, m.addrhi, m.read, m.write, m.offset, m.size);
  }
}

SNESJS.Bus.prototype.read = function(addr) {
  return this.reader[this.lookup[addr]](this.target[addr]);
}

SNESJS.Bus.prototype.write = function(addr, data) {
  return writer[this.lookup[addr]](this.target[addr], this.data);
}
