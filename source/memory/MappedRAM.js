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

SNESJS.Memory.MappedRAM = function() {
	this.data = 0;
	this.size = 0;
	this.write_protect = false;
}

//Required
SNESJS.Memory.MappedRAM.prototype.size = function() {
	return 0;
}

SNESJS.Memory.MappedRAM.prototype.read = function(addr) {
	return this.data[addr];
}

SNESJS.Memory.MappedRAM.prototype.write = function(addr, n) {
	if (!this.write_protect) {
		this.data[addr] = n;
	}
}

//End required
SNESJS.Memory.MappedRAM.prototype.reset = function() {
	this.data = 0;
	this.size = 0;
	this.write_protect = false;
}

SNESJS.Memory.MappedRAM.prototype.map = function(source, len) {
	this.reset();

	this.data = source;
	this.size = (this.data.length != 0) ? len : 0;
}

SNESJS.Memory.MappedRAM.prototype.copy = function(data, size) {
	if (this.data.length != 0) {
		this.size = (size & ~255) + (((size & 255) == 0 ? 0 : 1) << 8);
	}
	this.data = data.slice(0);
}

SNESJS.Memory.MappedRAM.prototype.write_protect = function(status) {
	this.write_protect = status;
}

SNESJS.Memory.MappedRAM.prototype.data = function() {
	return this.data;
}

SNESJS.Memory.MappedRAM.prototype.size = function() {
	return this.size;
}
