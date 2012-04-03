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

SNESJS.CPU.QueueEvent = {
	DramRefresh: 0,
	HdmaRun: 1
};

SNESJS.CPU.prototype.queue_event = function(id) {
  switch(id) {
    case SNESJS.CPU.QueueEvent.DramRefresh: 
    	return add_clocks(40);

    case SNESJS.CPU.QueueEvent.HdmaRun: 
    	return hdma_run();
  }
}

SNESJS.CPU.prototype.last_cycle = function() {
  if(this.status.irq_lock) {
    this.status.irq_lock = false;
    return;
  }

  if(this.status.nmi_transition) {
    regs.wai = false;
    this.status.nmi_transition = false;
    this.status.nmi_pending = true;
  }

  if(this.status.irq_transition || this.regs.irq) {
    this.regs.wai = false;
    this.status.irq_transition = false;
    this.status.irq_pending = !this.regs.p.i;
  }
}

SNESJS.CPU.prototype.add_clocks = function(clocks) {
  if(this.status.hirq_enabled) {
    if(this.status.virq_enabled) {
      var cpu_time = this.snes.ppucounter.vcounter() * 1364 + hcounter();
      var irq_time = this.status.vtime * 1364 + this.status.htime * 4;
      var framelines = (system.region.i == REGION_NTSC ? 262 : 312) + field();

      if(cpu_time > irq_time) {
      	irq_time += framelines * 1364;
      }

      var irq_valid = this.status.irq_valid;
      this.status.irq_valid = cpu_time <= irq_time && cpu_time + clocks > irq_time;

      if(!irq_valid && this.status.irq_valid) {
      	this.status.irq_line = true;
      }

    } else {

      var irq_time = this.status.htime * 4;

      if(hcounter() > irq_time) {
      	irq_time += 1364;
      }

      var irq_valid = this.status.irq_valid;

      this.status.irq_valid = hcounter() <= irq_time && hcounter() + clocks > irq_time;

      if(!irq_valid && this.status.irq_valid) {
      	this.status.irq_line = true;
      }

    }

    if(this.status.irq_line) {
    	this.status.irq_transition = true;
    }

  } else if(this.status.virq_enabled) {
    var irq_valid = this.status.irq_valid;
    this.status.irq_valid = vcounter() == this.status.vtime;

    if(!irq_valid && this.status.irq_valid) {
    	this.status.irq_line = true;
    }

    if(this.status.irq_line) {
    	this.status.irq_transition = true;
    }

  } else {
    this.status.irq_valid = false;
  }

  this.status.tick(clocks);
  queue.tick(clocks);
  step(clocks);
}

SNESJS.CPU.prototype.scanline = function() {
  this.status.synchronize_smp();
  this.status.synchronize_ppu();
  this.status.synchronize_coprocessors();

  this.snes.system.scanline();

  if(vcounter() == 0) hdma_init();

  queue.enqueue(534, SNESJS.CPU.QueueEvent.DramRefresh);

  if(vcounter() <= (ppu.overscan() == false ? 224 : 239)) {
    queue.enqueue(1104 + 8, SNESJS.CPU.QueueEvent.HdmaRun);
  }

  var nmi_valid = this.status.nmi_valid;
  this.status.nmi_valid = vcounter() >= (ppu.overscan() == false ? 225 : 240);

  if(!nmi_valid && this.status.nmi_valid) {
    this.status.nmi_line = true;

    if(this.status.nmi_enabled) {
    	this.status.nmi_transition = true;
    }

  } else if(nmi_valid && !this.status.nmi_valid) {
    this.status.nmi_line = false;
  }

  if(this.status.auto_joypad_poll_enabled && vcounter() == (ppu.overscan() == false ? 227 : 242)) {
    this.status.run_auto_joypad_poll();
  }
}

SNESJS.CPU.prototype.run_auto_joypad_poll = function() {
  this.snes.input.port1.latch(1);
  this.snes.input.port2.latch(1);
  this.snes.input.port1.latch(0);
  this.snes.input.port2.latch(0);

  var joy1 = 0, joy2 = 0, joy3 = 0, joy4 = 0;
  for(var i = 0; i < 16; i++) {
    var port0 = this.snes.input.port1.data();
    var port1 = this.snes.input.port2.data();

    joy1 |= (port0 & 1) ? (0x8000 >> i) : 0;
    joy2 |= (port1 & 1) ? (0x8000 >> i) : 0;
    joy3 |= (port0 & 2) ? (0x8000 >> i) : 0;
    joy4 |= (port1 & 2) ? (0x8000 >> i) : 0;
  }

  this.status.joy1l = joy1;
  this.status.joy1h = joy1 >> 8;

  this.status.joy2l = joy2;
  this.status.joy2h = joy2 >> 8;

  this.status.joy3l = joy3;
  this.status.joy3h = joy3 >> 8;

  this.status.joy4l = joy4;
  this.status.joy4h = joy4 >> 8;
}
