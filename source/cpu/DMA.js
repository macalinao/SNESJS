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

SNESJS.CPU.prototype.dma_transfer_valid = function(bbus, abus) {
  //transfers from WRAM to WRAM are invalid; chip only has one address bus
  return !(bbus == 0x80 && (
  (abus & 0xfe0000) == 0x7e0000 || (abus & 0x40e000) == 0x0000));
}

SNESJS.CPU.prototype.dma_addr_valid = function(abus) {
  //A-bus access to B-bus or S-CPU registers are invalid
  if ((abus & 0x40ff00) == 0x2100) return false; //$[00-3f|80-bf]:[2100-21ff]
  if ((abus & 0x40fe00) == 0x4000) return false; //$[00-3f|80-bf]:[4000-41ff]
  if ((abus & 0x40ffe0) == 0x4200) return false; //$[00-3f|80-bf]:[4200-421f]
  if ((abus & 0x40ff80) == 0x4300) return false; //$[00-3f|80-bf]:[4300-437f]
  return true;
}

SNESJS.CPU.prototype.dma_read = function(abus) {
  if (this.dma_addr_valid(abus) == false) return 0x00;
  return this.snes.bus.read(abus);
}

SNESJS.CPU.prototype.dma_write = function(valid, addr, data) {
  if (valid) {
    this.snes.bus.write(addr, data);
  }
}

SNESJS.CPU.prototype.dma_transfer = function(direction, bbus, abus) {
  if (direction == 0) {
    data = this.dma_read(abus);
    this.add_clocks(8);
    this.dma_write(this.dma_transfer_valid(bbus, abus), 0x2100 | bbus, data);
  } else {
    data = this.dma_transfer_valid(bbus, abus) ? this.snes.bus.read(0x2100 | bbus) : 0x00;
    this.add_clocks(8);
    this.dma_write(this.dma_addr_valid(abus), abus, data);
  }
}

SNESJS.CPU.prototype.dma_bbus = function(i, index) {
  switch (channel[i].transfer_mode) {
    default:
    case 0:
      return (channel[i].dest_addr); //0
    case 1:
      return (channel[i].dest_addr + (index & 1)); //0,1
    case 2:
      return (channel[i].dest_addr); //0,0
    case 3:
      return (channel[i].dest_addr + ((index >> 1) & 1)); //0,0,1,1
    case 4:
      return (channel[i].dest_addr + (index & 3)); //0,1,2,3
    case 5:
      return (channel[i].dest_addr + (index & 1)); //0,1,0,1
    case 6:
      return (channel[i].dest_addr); //0,0     [2]
    case 7:
      return (channel[i].dest_addr + ((index >> 1) & 1)); //0,0,1,1 [3]
  }
}

SNESJS.CPU.prototype.dma_addr = function(i) {
  var result = (channel[i].source_bank << 16) | (channel[i].source_addr);

  if (channel[i].fixed_transfer == false) {
    if (channel[i].reverse_transfer == false) {
      channel[i].source_addr++;
    } else {
      channel[i].source_addr--;
    }
  }

  return result;
}

SNESJS.CPU.prototype.hdma_addr = function(i) {
  return (channel[i].source_bank << 16) | (channel[i].hdma_addr++);
}

SNESJS.CPU.prototype.hdma_iaddr = function(i) {
  return (channel[i].indirect_bank << 16) | (channel[i].indirect_addr++);
}

SNESJS.CPU.prototype.dma_run = function() {
  this.add_clocks(16);

  for (var i = 0; i < 8; i++) {
    if (channel[i].dma_enabled == false) continue;
    this.add_clocks(8);

    var index = 0;
    do {
      dma_transfer(channel[i].direction, this.dma_bbus(i, index++), this.dma_addr(i));
    } while (channel[i].dma_enabled && --channel[i].transfer_size);

    channel[i].dma_enabled = false;
  }

  cpu_status_irq_lock = true;
}

SNESJS.CPU.prototype.hdma_active_after = function(i) {
  for (var n = i + 1; i < 8; i++) {
    if (channel[i].hdma_enabled && !channel[i].hdma_completed) return true;
  }
  return false;
}

SNESJS.CPU.prototype.hdma_update = function(i) {
  if ((channel[i].line_counter & 0x7f) == 0) {
    channel[i].line_counter = this.dma_read(hdma_addr(i));
    channel[i].hdma_completed = (channel[i].line_counter == 0);
    channel[i].hdma_do_transfer = !channel[i].hdma_completed;
    this.add_clocks(8);

    if (channel[i].indirect) {
      channel[i].indirect_addr = this.dma_read(this.hdma_addr(i)) << 8;
      this.add_clocks(8);

      //emulating this glitch causes a slight slowdown; only enable if needed
      //if(!channel[i].hdma_completed || hdma_active_after(i)) {
      channel[i].indirect_addr >>= 8;
      channel[i].indirect_addr |= this.dma_read(this.hdma_addr(i)) << 8;
      this.add_clocks(8);
      //}
    }
  }
}

SNESJS.CPU.transfer_length = [1, 2, 2, 4, 4, 4, 2, 4];

SNESJS.CPU.prototype.hdma_run = function() {
  var channels = 0;
  for (var i = 0; i < 8; i++) {
    if (channel[i].hdma_enabled) channels++;
  }
  if (channels == 0) return;

  this.add_clocks(16);
  for (var i = 0; i < 8; i++) {
    if (channel[i].hdma_enabled == false || channel[i].hdma_completed == true) continue;
    channel[i].dma_enabled = false;

    if (channel[i].hdma_do_transfer) {
      var length = transfer_length[channel[i].transfer_mode];
      for (var index = 0; index < length; index++) {
        var addr = channel[i].indirect == false ? hdma_addr(i) : hdma_iaddr(i);
        dma_transfer(channel[i].direction, dma_bbus(i, index), addr);
      }
    }
  }

  for (var i = 0; i < 8; i++) {
    if (channel[i].hdma_enabled == false || channel[i].hdma_completed == true) continue;

    channel[i].line_counter--;
    channel[i].hdma_do_transfer = channel[i].line_counter & 0x80;
    hdma_update(i);
  }

  cpu_status_irq_lock = true;
}

SNESJS.CPU.prototype.hdma_init = function() {
  var channels = 0;
  for (var i = 0; i < 8; i++) {
    channel[i].hdma_completed = false;
    channel[i].hdma_do_transfer = false;
    if (channel[i].hdma_enabled) {
      channels++;
    } 
  }
  if (channels == 0) return;

  this.add_clocks(16);
  for (var i = 0; i < 8; i++) {
    if (!channel[i].hdma_enabled) continue;
    channel[i].dma_enabled = false;

    channel[i].hdma_addr = channel[i].source_addr;
    channel[i].line_counter = 0;
    this.hdma_update(i);
  }

  cpu_status_irq_lock = true;
}

SNESJS.CPU.prototype.dma_reset = function() {
  for (var i = 0; i < 8; i++) {
    channel[i].dma_enabled = false;
    channel[i].hdma_enabled = false;

    channel[i].direction = 1;
    channel[i].indirect = true;
    channel[i].unused = true;
    channel[i].reverse_transfer = true;
    channel[i].fixed_transfer = true;
    channel[i].transfer_mode = 0x07;

    channel[i].dest_addr = 0xff;
    channel[i].source_addr = 0xffff;
    channel[i].source_bank = 0xff;

    channel[i].transfer_size = 0xffff;
    channel[i].indirect_addr = 0xffff;

    channel[i].indirect_bank = 0xff;
    channel[i].hdma_addr = 0xff;
    channel[i].line_counter = 0xff;
    channel[i].unknown = 0xff;

    channel[i].hdma_completed = false;
    channel[i].hdma_do_transfer = false;
  }
}
