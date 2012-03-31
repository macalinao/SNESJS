
//
SNESJS.SMP = function(snes) {
    this.snes = snes;
}

SNESJS.SMP.prototype.step = function(clocks) {
    processor.clock += clocks * snes.cpu.frequency;
    snes.dsp.clock -= clocks;
}

SNESJS.SMP.prototype.synchronize_cpu = function() {
    while(this.clock >= 0) {
        snes.cpu.enter();
    }
}

SNESJS.SMP.prototype.synchronize_dsp = function() {
    while(snes.dsp.clock < 0) {
        snes.dsp.enter();
    }
}

SNESJS.SMP.prototype.enter = function() {
    while(true) {
        this._op_step();
    }
}

SNESJS.SMP.prototype.power = function() {

}

SNESJS.SMP.prototype._op_step = function() {
    this.opcode_table[this.op_readpc()]();
}

        public byte port_read(uint2 port)
        {
            return StaticRAM.apuram[0xf4 + (uint)port];
        }

        public void port_write(uint2 port, byte data)
        {
            StaticRAM.apuram[0xf4 + (uint)port] = data;
        }

        public void power()
        {   //targets not initialized/changed upon reset
            t0.target = 0;
            t1.target = 0;
            t2.target = 0;

            reset();
        }

        public void reset()
        {
            Processor.create("SMP", Enter, System.system.apu_frequency);

            regs.pc = 0xffc0;
            regs.a.Array[regs.a.Offset] = 0x00;
            regs.x.Array[regs.x.Offset] = 0x00;
            regs.y.Array[regs.y.Offset] = 0x00;
            regs.sp.Array[regs.sp.Offset] = 0xef;
            regs.p.Assign(0x02);

            for (uint i = 0; i < StaticRAM.apuram.size(); i++)
            {
                StaticRAM.apuram.write(i, 0x00);
            }

            status.clock_counter = 0;
            status.dsp_counter = 0;
            status.timer_step = 3;

            //$00f0
            status.clock_speed = 0;
            status.timer_speed = 0;
            status.timers_enabled = true;
            status.ram_disabled = false;
            status.ram_writable = true;
            status.timers_disabled = false;

            //$00f1
            status.iplrom_enabled = true;

            //$00f2
            status.dsp_addr = 0x00;

            //$00f8,$00f9
            status.ram0 = 0x00;
            status.ram1 = 0x00;

            t0.stage0_ticks = 0;
            t1.stage0_ticks = 0;
            t2.stage0_ticks = 0;

            t0.stage1_ticks = 0;
            t1.stage1_ticks = 0;
            t2.stage1_ticks = 0;

            t0.stage2_ticks = 0;
            t1.stage2_ticks = 0;
            t2.stage2_ticks = 0;

            t0.stage3_ticks = 0;
            t1.stage3_ticks = 0;
            t2.stage3_ticks = 0;

            t0.current_line = Convert.ToBoolean(0);
            t1.current_line = Convert.ToBoolean(0);
            t2.current_line = Convert.ToBoolean(0);

            t0.enabled = false;
            t1.enabled = false;
            t2.enabled = false;
        }

        public void serialize(Serializer s)
        {
            Processor.serialize(s);
            base.core_serialize(s);

            s.integer(status.clock_counter, "status.clock_counter");
            s.integer(status.dsp_counter, "status.dsp_counter");
            s.integer(status.timer_step, "status.timer_step");

            s.integer(status.clock_speed, "status.clock_speed");
            s.integer(status.timer_speed, "status.timer_speed");
            s.integer(status.timers_enabled, "status.timers_enabled");
            s.integer(status.ram_disabled, "status.ram_disabled");
            s.integer(status.ram_writable, "status.ram_writable");
            s.integer(status.timers_disabled, "status.timers_disabled");

            s.integer(status.iplrom_enabled, "status.iplrom_enabled");

            s.integer(status.dsp_addr, "status.dsp_addr");

            s.integer(status.ram0, "status.ram0");
            s.integer(status.ram1, "status.ram1");

            s.integer(t0.stage0_ticks, "t0.stage0_ticks");
            s.integer(t0.stage1_ticks, "t0.stage1_ticks");
            s.integer(t0.stage2_ticks, "t0.stage2_ticks");
            s.integer(t0.stage3_ticks, "t0.stage3_ticks");
            s.integer(t0.current_line, "t0.current_line");
            s.integer(t0.enabled, "t0.enabled");
            s.integer(t0.target, "t0.target");

            s.integer(t1.stage0_ticks, "t1.stage0_ticks");
            s.integer(t1.stage1_ticks, "t1.stage1_ticks");
            s.integer(t1.stage2_ticks, "t1.stage2_ticks");
            s.integer(t1.stage3_ticks, "t1.stage3_ticks");
            s.integer(t1.current_line, "t1.current_line");
            s.integer(t1.enabled, "t1.enabled");
            s.integer(t1.target, "t1.target");

            s.integer(t2.stage0_ticks, "t2.stage0_ticks");
            s.integer(t2.stage1_ticks, "t2.stage1_ticks");
            s.integer(t2.stage2_ticks, "t2.stage2_ticks");
            s.integer(t2.stage3_ticks, "t2.stage3_ticks");
            s.integer(t2.current_line, "t2.current_line");
            s.integer(t2.enabled, "t2.enabled");
            s.integer(t2.target, "t2.target");
        }

        public SMP() { }

        private byte ram_read(ushort addr)
        {
            if (addr >= 0xffc0 && status.iplrom_enabled)
            {
                return iplrom[addr & 0x3f];
            }
            if (status.ram_disabled)
            {
                return 0x5a;  //0xff on mini-SNES
            }
            return StaticRAM.apuram[addr];
        }

        private void ram_write(ushort addr, byte data)
        {   //writes to $ffc0-$ffff always go to apuram, even if the iplrom is enabled
            if (status.ram_writable && !status.ram_disabled)
            {
                StaticRAM.apuram[addr] = data;
            }
        }

        private byte op_busread(ushort addr)
        {
            byte r = default(byte);
            if ((addr & 0xfff0) == 0x00f0)
            {  //00f0-00ff
                switch (addr)
                {
                    case 0xf0:
                        {  //TEST -- write-only register
                            r = 0x00;
                        }
                        break;
                    case 0xf1:
                        {  //CONTROL -- write-only register
                            r = 0x00;
                        }
                        break;
                    case 0xf2:
                        {  //DSPADDR
                            r = status.dsp_addr;
                        }
                        break;
                    case 0xf3:
                        {  //DSPDATA
                            //0x80-0xff are read-only mirrors of 0x00-0x7f
                            r = DSP.dsp.read((byte)(status.dsp_addr & 0x7f));
                        }
                        break;
                    case 0xf4:    //CPUIO0
                    case 0xf5:    //CPUIO1
                    case 0xf6:    //CPUIO2
                    case 0xf7:
                        {  //CPUIO3
                            synchronize_cpu();
#if PERFORMANCE
                            r = CPU.cpu.port_read((byte)addr);
#else
                            r = CPU.cpu.port_read(new uint2(addr));
#endif
                        }
                        break;
                    case 0xf8:
                        {  //RAM0
                            r = status.ram0;
                        } break;
                    case 0xf9:
                        {  //RAM1
                            r = status.ram1;
                        }
                        break;
                    case 0xfa:    //T0TARGET
                    case 0xfb:    //T1TARGET
                    case 0xfc:
                        {  //T2TARGET -- write-only registers
                            r = 0x00;
                        }
                        break;
                    case 0xfd:
                        {  //T0OUT -- 4-bit counter value
                            r = (byte)(t0.stage3_ticks & 15);
                            t0.stage3_ticks = 0;
                        }
                        break;
                    case 0xfe:
                        {  //T1OUT -- 4-bit counter value
                            r = (byte)(t1.stage3_ticks & 15);
                            t1.stage3_ticks = 0;
                        }
                        break;
                    case 0xff:
                        {  //T2OUT -- 4-bit counter value
                            r = (byte)(t2.stage3_ticks & 15);
                            t2.stage3_ticks = 0;
                        }
                        break;
                }
            }
            else
            {
                r = ram_read(addr);
            }

            return r;
        }

        private void op_buswrite(ushort addr, byte data)
        {
            if ((addr & 0xfff0) == 0x00f0)
            {  //$00f0-00ff
                switch (addr)
                {
                    case 0xf0:
                        {  //TEST
                            if (regs.p.p)
                            {
                                break;  //writes only valid when P flag is clear
                            }

                            status.clock_speed = (byte)((data >> 6) & 3);
                            status.timer_speed = (byte)((data >> 4) & 3);
                            status.timers_enabled = Convert.ToBoolean(data & 0x08);
                            status.ram_disabled = Convert.ToBoolean(data & 0x04);
                            status.ram_writable = Convert.ToBoolean(data & 0x02);
                            status.timers_disabled = Convert.ToBoolean(data & 0x01);

                            status.timer_step = (uint)((1 << status.clock_speed) + (2 << status.timer_speed));

                            t0.sync_stage1();
                            t1.sync_stage1();
                            t2.sync_stage1();
                        } break;
                    case 0xf1:
                        {  //CONTROL
                            status.iplrom_enabled = Convert.ToBoolean(data & 0x80);

                            if (Convert.ToBoolean(data & 0x30))
                            {
                                //one-time clearing of APU port read registers,
                                //emulated by simulating CPU writes of 0x00
                                synchronize_cpu();
                                if (Convert.ToBoolean(data & 0x20))
                                {
#if PERFORMANCE
                                    CPU.cpu.port_write(2, 0x00);
                                    CPU.cpu.port_write(3, 0x00);
#else
                                    CPU.cpu.port_write(new uint2(2), 0x00);
                                    CPU.cpu.port_write(new uint2(3), 0x00);
#endif
                                }
                                if (Convert.ToBoolean(data & 0x10))
                                {
#if PERFORMANCE
                                    CPU.cpu.port_write(0, 0x00);
                                    CPU.cpu.port_write(1, 0x00);
#else
                                    CPU.cpu.port_write(new uint2(0), 0x00);
                                    CPU.cpu.port_write(new uint2(1), 0x00);
#endif
                                }
                            }

                            //0->1 transistion resets timers
                            if (t2.enabled == false && Convert.ToBoolean(data & 0x04))
                            {
                                t2.stage2_ticks = 0;
                                t2.stage3_ticks = 0;
                            }
                            t2.enabled = Convert.ToBoolean(data & 0x04);

                            if (t1.enabled == false && Convert.ToBoolean(data & 0x02))
                            {
                                t1.stage2_ticks = 0;
                                t1.stage3_ticks = 0;
                            }
                            t1.enabled = Convert.ToBoolean(data & 0x02);

                            if (t0.enabled == false && Convert.ToBoolean(data & 0x01))
                            {
                                t0.stage2_ticks = 0;
                                t0.stage3_ticks = 0;
                            }
                            t0.enabled = Convert.ToBoolean(data & 0x01);
                        } break;
                    case 0xf2:
                        {  //DSPADDR
                            status.dsp_addr = data;
                        } break;
                    case 0xf3:
                        {  //DSPDATA
                            //0x80-0xff are read-only mirrors of 0x00-0x7f
                            if (!Convert.ToBoolean(status.dsp_addr & 0x80))
                            {
                                DSP.dsp.write((byte)(status.dsp_addr & 0x7f), data);
                            }
                        } break;
                    case 0xf4:    //CPUIO0
                    case 0xf5:    //CPUIO1
                    case 0xf6:    //CPUIO2
                    case 0xf7:
                        {  //CPUIO3
                            synchronize_cpu();
                            port_write(new uint2(addr), data);
                        } break;
                    case 0xf8:
                        {  //RAM0
                            status.ram0 = data;
                        } break;
                    case 0xf9:
                        {  //RAM1
                            status.ram1 = data;
                        } break;
                    case 0xfa:
                        {  //T0TARGET
                            t0.target = data;
                        } break;
                    case 0xfb:
                        {  //T1TARGET
                            t1.target = data;
                        } break;
                    case 0xfc:
                        {  //T2TARGET
                            t2.target = data;
                        } break;
                    case 0xfd:    //T0OUT
                    case 0xfe:    //T1OUT
                    case 0xff:
                        {  //T2OUT -- read-only registers
                        }
                        break;
                }
            }

            //all writes, even to MMIO registers, appear on bus
            ram_write(addr, data);
        }

        public override void op_io()
        {
            add_clocks(24);
            cycle_edge();
        }

        public override byte op_read(ushort addr)
        {
            add_clocks(12);
            byte r = op_busread(addr);
            add_clocks(12);
            cycle_edge();
            return r;
        }

        public override void op_write(ushort addr, byte data)
        {
            add_clocks(24);
            op_buswrite(addr, data);
            cycle_edge();
        }

        private sSMPTimer t0 = new sSMPTimer(192);
        private sSMPTimer t1 = new sSMPTimer(192);
        private sSMPTimer t2 = new sSMPTimer(24);

        private void add_clocks(uint clocks)
        {
            step(clocks);

            //forcefully sync S-SMP to S-CPU in case chips are not communicating
            //sync if S-SMP is more than 24 samples ahead of S-CPU
            if (Processor.clock > +(768 * 24 * (long)24000000))
            {
                synchronize_cpu();
            }
        }

        private void cycle_edge()
        {
            t0.tick();
            t1.tick();
            t2.tick();

            //TEST register S-SMP speed control
            //24 clocks have already been added for this cycle at this point
            switch (status.clock_speed)
            {
                case 0:
                    break;                       //100% speed
                case 1:
                    add_clocks(24);
                    break;       // 50% speed
                case 2:
                    while (true)
                    {
                        add_clocks(24);  //  0% speed -- locks S-SMP
                    }
                case 3:
                    add_clocks(24 * 9);
                    break;   // 10% speed
            }
        }

        //this is the IPLROM for the S-SMP coprocessor.
        //the S-SMP does not allow writing to the IPLROM.
        //all writes are instead mapped to the extended
        //RAM region, accessible when $f1.d7 is clear.

        private static readonly byte[] iplrom = new byte[64]
        {
            /*ffc0*/  0xcd, 0xef,        //mov   x,#$ef
            /*ffc2*/  0xbd,              //mov   sp,x
            /*ffc3*/  0xe8, 0x00,        //mov   a,#$00
            /*ffc5*/  0xc6,              //mov   (x),a
            /*ffc6*/  0x1d,              //dec   x
            /*ffc7*/  0xd0, 0xfc,        //bne   $ffc5
            /*ffc9*/  0x8f, 0xaa, 0xf4,  //mov   $f4,#$aa
            /*ffcc*/  0x8f, 0xbb, 0xf5,  //mov   $f5,#$bb
            /*ffcf*/  0x78, 0xcc, 0xf4,  //cmp   $f4,#$cc
            /*ffd2*/  0xd0, 0xfb,        //bne   $ffcf
            /*ffd4*/  0x2f, 0x19,        //bra   $ffef
            /*ffd6*/  0xeb, 0xf4,        //mov   y,$f4
            /*ffd8*/  0xd0, 0xfc,        //bne   $ffd6
            /*ffda*/  0x7e, 0xf4,        //cmp   y,$f4
            /*ffdc*/  0xd0, 0x0b,        //bne   $ffe9
            /*ffde*/  0xe4, 0xf5,        //mov   a,$f5
            /*ffe0*/  0xcb, 0xf4,        //mov   $f4,y
            /*ffe2*/  0xd7, 0x00,        //mov   ($00)+y,a
            /*ffe4*/  0xfc,              //inc   y
            /*ffe5*/  0xd0, 0xf3,        //bne   $ffda
            /*ffe7*/  0xab, 0x01,        //inc   $01
            /*ffe9*/  0x10, 0xef,        //bpl   $ffda
            /*ffeb*/  0x7e, 0xf4,        //cmp   y,$f4
            /*ffed*/  0x10, 0xeb,        //bpl   $ffda
            /*ffef*/  0xba, 0xf6,        //movw  ya,$f6
            /*fff1*/  0xda, 0x00,        //movw  $00,ya
            /*fff3*/  0xba, 0xf4,        //movw  ya,$f4
            /*fff5*/  0xc4, 0xf4,        //mov   $f4,a
            /*fff7*/  0xdd,              //mov   a,y
            /*fff8*/  0x5d,              //mov   x,a
            /*fff9*/  0xd0, 0xdb,        //bne   $ffd6
            /*fffb*/  0x1f, 0x00, 0x00,  //jmp   ($0000+x)
            /*fffe*/  0xc0, 0xff         //reset vector location ($ffc0)
        };

        public static byte[] Iplrom
        {
            get { return SMP.iplrom; }
        }


        private Status status = new Status();

        private static void Enter()
        {
            SMP.smp.enter();
        }


        private Processor _processor = new Processor();
        public Processor Processor
        {
            get
            {
                return _processor;
            }
        }
    }
}
