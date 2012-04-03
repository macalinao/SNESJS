
SNESJS.Bus = function() {
  lookup = new uint8 [16 * 1024 * 1024];
  target = new uint32[16 * 1024 * 1024];
}

SNESJS.Bus.prototype.mirror = function( addr,  size) {
   base = 0;
  if(size) {
     mask = 1 << 23;
    while(addr >= size) {
      while(!(addr & mask)) mask >>= 1;
      addr -= mask;
      if(size > mask) {
        size -= mask;
        base += mask;
      }
      mask >>= 1;
    }
    base += addr;
  }
  return base;
}

SNESJS.Bus.prototype.map = function(
  MapMode::e mode,
   bank_lo,  bank_hi,
   addr_lo,  addr_hi,
  const function<uint8 ()> &rd,
  const function<void (, uint8)> &wr,
   base,  length
) {
  assert(bank_lo <= bank_hi && bank_lo <= 0xff);
  assert(addr_lo <= addr_hi && addr_lo <= 0xffff);
   id = idcount++;
  assert(id < 255);
  reader[id] = rd;
  writer[id] = wr;

  if(length == 0) length = (bank_hi - bank_lo + 1) * (addr_hi - addr_lo + 1);

   offset = 0;
  for( bank = bank_lo; bank <= bank_hi; bank++) {
    for( addr = addr_lo; addr <= addr_hi; addr++) {
       destaddr = (bank << 16) | addr;
      if(mode == MapMode::Linear) destaddr = mirror(base + offset++, length);
      if(mode == MapMode::Shadow) destaddr = mirror(base + destaddr, length);
      lookup[(bank << 16) | addr] = id;
      target[(bank << 16) | addr] = destaddr;
    }
  }
}

SNESJS.Bus.prototype.map_reset = function() {
  function<uint8 ()> reader(bus_reader_dummy);
  function<void (, uint8)> writer(bus_writer_dummy);

  idcount = 0;
  map(MapMode::Direct, 0x00, 0xff, 0x0000, 0xffff, reader, writer);
}

SNESJS.Bus.prototype.map_xml = function() {
  foreach(m, cartridge.mapping) {
    map(m.mode.i, m.banklo, m.bankhi, m.addrlo, m.addrhi, m.read, m.write, m.offset, m.size);
  }
}
