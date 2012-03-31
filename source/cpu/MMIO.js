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
            var result = this.snes.bus.read(0x7e0000 | cpu_status_wram_addr);
            cpu_status_wram_addr = (cpu_status_wram_addr + 1) & 0x01ffff;
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
            result |= (Convert.ToInt32(cpu_status_nmi_line) << 7);
            result |= 0x02;  //CPU revision
            cpu_status_nmi_line = false;
            return result;

        case 0x4211:
            var result = this.regs.mdr & 0x7f;
            result |= (cpu_status_irq_line ? 1 : 0) << 7;
            cpu_status_irq_line = false;
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
            return cpu_status_pio;

        case 0x4214:
            return cpu_status_rddiv >> 0;

        case 0x4215:
            return cpu_status_rddiv >> 8;

        case 0x4216:
            return cpu_status_rdmpy >> 0;

        case 0x4217:
            return cpu_status_rdmpy >> 8;

        case 0x4218:
            return cpu_status_joy1l;

        case 0x4219:
            return cpu_status_joy1h;

        case 0x421a:
            return cpu_status_joy2l;

        case 0x421b:
            return cpu_status_joy2h;

        case 0x421c:
            return cpu_status_joy3l;

        case 0x421d:
            return cpu_status_joy3h;

        case 0x421e:
            return cpu_status_joy4l;

        case 0x421f:
            return cpu_status_joy4h;
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
            this.snes.bus.write(new uint24(0x7e0000 | cpu_status_wram_addr), data);
            cpu_status_wram_addr = (cpu_status_wram_addr + 1) & 0x01ffff;
            return;

        case 0x2181:
            cpu_status_wram_addr = (cpu_status_wram_addr & 0x01ff00) | (data << 0);
            return;

        case 0x2182:
            cpu_status_wram_addr = (cpu_status_wram_addr & 0x0100ff) | (data << 8);
            return;

        case 0x2183:
            cpu_status_wram_addr = (cpu_status_wram_addr & 0x00ffff) | ((data & 1) << 16);
            return;

        case 0x4016:
            this.snes.input.port1.latch(data & 1);
            this.snes.input.port2.latch(data & 1);
            return;

        case 0x4200:
            var nmi_enabled = cpu_status_nmi_enabled;
            var virq_enabled = cpu_status_virq_enabled;
            var hirq_enabled = cpu_status_hirq_enabled;

            cpu_status_nmi_enabled = (data & 0x80) != 0;
            cpu_status_virq_enabled = (data & 0x20) != 0;
            cpu_status_hirq_enabled = (data & 0x10) != 0;
            cpu_status_auto_joypad_poll_enabled = (data & 0x01) != 0;

            if (!nmi_enabled && cpu_status_nmi_enabled && cpu_status_nmi_line) {
                cpu_status_nmi_transition = true;
            }

            if (cpu_status_virq_enabled && !cpu_status_hirq_enabled && cpu_status_irq_line) {
                cpu_status_irq_transition = true;
            }

            if (!cpu_status_virq_enabled && !cpu_status_hirq_enabled) {
                cpu_status_irq_line = false;
                cpu_status_irq_transition = false;
            }

            cpu_status_irq_lock = true;
            return;

        case 0x4201:
            if ((cpu_status_pio & 0x80) != 0 && (data & 0x80) == 0) {
                this.snes.ppu.latch_counters();
            }
            cpu_status_pio = data;

        case 0x4202:
            cpu_status_wrmpya = data;
            return;

        case 0x4203:
            cpu_status_wrmpyb = data;
            cpu_status_rdmpy = (cpu_status_wrmpya * cpu_status_wrmpyb);
            return;

        case 0x4204:
            cpu_status_wrdiva = ((cpu_status_wrdiva & 0xff00) | (data << 0));
            return;

        case 0x4205:
            cpu_status_wrdiva = ((data << 8) | (cpu_status_wrdiva & 0x00ff));
            return;

        case 0x4206:
            cpu_status_wrdivb = data;
            cpu_status_rddiv = ((cpu_status_wrdivb != 0) ? cpu_status_wrdiva / cpu_status_wrdivb : 0xffff);
            cpu_status_rdmpy = ((cpu_status_wrdivb != 0) ? cpu_status_wrdiva % cpu_status_wrdivb : cpu_status_wrdiva);
            return;

        case 0x4207:
            cpu_status_htime = ((cpu_status_htime & 0x0100) | (data << 0));
            return;

        case 0x4208:
            cpu_status_htime = (((data & 1) << 8) | (cpu_status_htime & 0x00ff));
            return;

        case 0x4209:
            cpu_status_vtime = ((cpu_status_vtime & 0x0100) | (data << 0));
            return;

        case 0x420a:
            cpu_status_vtime = (((data & 1) << 8) | (cpu_status_vtime & 0x00ff));
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
            cpu_status_rom_speed = (data & 1) != 0 ? 6 : 8;
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