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

SNESJS.CPU.prototype.mmio_read = function(addr) {
    if ((addr & 0xffc0) == 0x2140) {
        synchronize_smp();
        return this.snes.smp.port_read(new uint2(addr & 3));
    }

    switch (addr & 0xffff) {
        case 0x2180:
            var result = this.snes.bus.read(0x7e0000 | this.wram_addr);
            this.wram_addr = (this.wram_addr + 1) & 0x01ffff;
            return result;

        case 0x4016:
            var result = regs.mdr & 0xfc;
            result |= (Input.input.port_read(false) & 3);
            return result;

        case 0x4017:
            var result = (this.regs.mdr & 0xe0) | 0x1c;
            result |= (Input.input.port_read(true) & 3);
            return result;

        case 0x4210:
            var result = this.regs.mdr & 0x70;
            result |= ((this.nmi_line ? 1 : 0) << 7);
            result |= 0x02;  //CPU revision
            this.nmi_line = false;
            return result;

        case 0x4211:
            var result = this.regs.mdr & 0x7f;
            result |= (this.irq_line ? 1 : 0) << 7;
            this.irq_line = false;
            return result;

        case 0x4212:
            var result = (this.regs.mdr & 0x3e);
            vbstart = this.snes.ppu.overscan() ? 240 : 225;

            if (this.snes.ppucounter.vcounter() >= vbstart && this.snes.ppucounter.vcounter() <= vbstart + 2) {
                result |= 0x01;
            }

            if (this.snes.ppucounter.hcounter() <= 2 || this.snes.ppucounter.hcounter() >= 1096) {
                result |= 0x40;
            }
            if (this.snes.ppucounter.vcounter() >= vbstart){
                result |= 0x80;
            }

            return result;

        case 0x4213:
            return this.pio;

        case 0x4214:
            return this.rddiv >> 0;

        case 0x4215:
            return this.rddiv >> 8;

        case 0x4216:
            return this.rdmpy >> 0;

        case 0x4217:
            return this.rdmpy >> 8;

        case 0x4218:
            return this.joy1l;

        case 0x4219:
            return this.joy1h;

        case 0x421a:
            return this.joy2l;

        case 0x421b:
            return this.joy2h;

        case 0x421c:
            return this.joy3l;

        case 0x421d:
            return this.joy3h;

        case 0x421e:
            return this.joy4l;

        case 0x421f:
            return this.joy4h;
    }

    if ((addr & 0xff80) == 0x4300) {
        i = (addr >> 4) & 7;
        switch (addr & 0xff8f) {
            case 0x4300:
                return ((channel[i].direction ? 1 : 0) << 7)
                | ((channel[i].indirect ? 1 : 0) << 6)
                | ((channel[i].unused ? 1 : 0) << 5)
                | ((channel[i].reverse_transfer ? 1 : 0) << 4)
                | ((channel[i].fixed_transfer ? 1 : 0) << 3)
                | (channel[i].transfer_mode << 0);

            case 0x4301:
                return channel[i].dest_addr;

            case 0x4302:
                return channel[i].source_addr >> 0;

            case 0x4303:
                return channel[i].source_addr >> 8;

            case 0x4304:
                return channel[i].source_bank;

            case 0x4305:
                return channel[i].union.transfer_size >> 0;

            case 0x4306:
                return channel[i].union.transfer_size >> 8;

            case 0x4307:
                return channel[i].indirect_bank;

            case 0x4308:
                return channel[i].hdma_addr >> 0;

            case 0x4309:
                return channel[i].hdma_addr >> 8;

            case 0x430a:
                return channel[i].line_counter;

            case 0x430b:
            case 0x430f:
                return channel[i].unknown;
        }
    }

    return this.regs.mdr;
}

SNESJS.CPU.prototype.mmio_write = function(addr, data) {
    if ((addr & 0xffc0) == 0x2140) {
        this.synchronize_smp();
        this.port_write((addr & 3), data);
        return;
    }

    switch (addr & 0xffff) {
        case 0x2180:
            this.snes.bus.write(new uint24(0x7e0000 | this.wram_addr), data);
            this.wram_addr = (this.wram_addr + 1) & 0x01ffff;
            return;

        case 0x2181:
            this.wram_addr = (this.wram_addr & 0x01ff00) | (data << 0);
            return;

        case 0x2182:
            this.wram_addr = (this.wram_addr & 0x0100ff) | (data << 8);
            return;

        case 0x2183:
            this.wram_addr = (this.wram_addr & 0x00ffff) | ((data & 1) << 16);
            return;

        case 0x4016:
            this.snes.input.port1.latch(data & 1);
            this.snes.input.port2.latch(data & 1);
            return;

        case 0x4200:
            var nmi_enabled = this.nmi_enabled;
            var virq_enabled = this.virq_enabled;
            var hirq_enabled = this.hirq_enabled;

            this.nmi_enabled = (data & 0x80) != 0;
            this.virq_enabled = (data & 0x20) != 0;
            this.hirq_enabled = (data & 0x10) != 0;
            this.auto_joypad_poll_enabled = (data & 0x01) != 0;

            if (!nmi_enabled && this.nmi_enabled && this.nmi_line) {
                this.nmi_transition = true;
            }

            if (this.virq_enabled && !this.hirq_enabled && this.irq_line) {
                this.irq_transition = true;
            }

            if (!this.virq_enabled && !this.hirq_enabled) {
                this.irq_line = false;
                this.irq_transition = false;
            }

            this.irq_lock = true;
            return;

        case 0x4201:
            if ((this.pio & 0x80) != 0 && (data & 0x80) == 0) {
                this.snes.ppu.latch_counters();
            }
            this.pio = data;

        case 0x4202:
            this.wrmpya = data;
            return;

        case 0x4203:
            this.wrmpyb = data;
            this.rdmpy = (this.wrmpya * this.wrmpyb);
            return;

        case 0x4204:
            this.wrdiva = ((this.wrdiva & 0xff00) | (data << 0));
            return;

        case 0x4205:
            this.wrdiva = ((data << 8) | (this.wrdiva & 0x00ff));
            return;

        case 0x4206:
            this.wrdivb = data;
            this.rddiv = ((this.wrdivb != 0) ? this.wrdiva / this.wrdivb : 0xffff);
            this.rdmpy = ((this.wrdivb != 0) ? this.wrdiva % this.wrdivb : this.wrdiva);
            return;

        case 0x4207:
            this.htime = ((this.htime & 0x0100) | (data << 0));
            return;

        case 0x4208:
            this.htime = (((data & 1) << 8) | (this.htime & 0x00ff));
            return;

        case 0x4209:
            this.vtime = ((this.vtime & 0x0100) | (data << 0));
            return;

        case 0x420a:
            this.vtime = (((data & 1) << 8) | (this.vtime & 0x00ff));
            return;

        case 0x420b:
            for (var i = 0; i < 8; i++) {
                channel[i].dma_enabled = (data & (1 << i)) != 0;
            }
            if (data != 0) {
                dma_run();
            }
            return;

        case 0x420c:
            for (var i = 0; i < 8; i++) {
                channel[i].hdma_enabled = (data & (1 << i)) != 0;
            }
            return;

        case 0x420d:
            this.rom_speed = (data & 1) != 0 ? 6 : 8;
            return;
    }

    if ((addr & 0xff80) == 0x4300) {
        var i = (addr >> 4) & 7;

        switch (addr & 0xff8f) {
            case 0x4300:
                channel[i].direction = (data & 0x80) != 0;
                channel[i].indirect = (data & 0x40) != 0;
                channel[i].unused = (data & 0x20) != 0;
                channel[i].reverse_transfer = (data & 0x10) != 0;
                channel[i].fixed_transfer = (data & 0x08) != 0;
                channel[i].transfer_mode = (data & 0x07);
                return;

            case 0x4301:
                channel[i].dest_addr = data;
                return;

            case 0x4302:
                channel[i].source_addr = ((channel[i].source_addr & 0xff00) | (data << 0));
                return;

            case 0x4303:
                channel[i].source_addr = ((data << 8) | (channel[i].source_addr & 0x00ff));
                return;

            case 0x4304:
                channel[i].source_bank = data;
                return;

            case 0x4305:
                channel[i].union.transfer_size = ((channel[i].union.transfer_size & 0xff00) | (data << 0));
                return;

            case 0x4306:
                channel[i].union.transfer_size = ((data << 8) | (channel[i].union.transfer_size & 0x00ff));
                return;

            case 0x4307:
                channel[i].indirect_bank = data;
                return;

            case 0x4308:
                channel[i].hdma_addr = ((channel[i].hdma_addr & 0xff00) | (data << 0));
                return;

            case 0x4309:
                channel[i].hdma_addr = ((data << 8) | (channel[i].hdma_addr & 0x00ff));
                return;

            case 0x430a:
                channel[i].line_counter = data;
                return;

            case 0x430b:
            case 0x430f:
                channel[i].unknown = data;
                return;
        }
    }
}