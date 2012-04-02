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

SNESJS.CPU.Channel = function() {
      this.dma_enabled = false;
      this.hdma_enabled = false;

      this.direction = false;
      this.indirect = false;
      this.unused = false;
      this.reverse_transfer = false;
      this.fixed_transfer = false;
      this.transfer_mode = 0;

      this.dest_addr = 0;
      this.source_addr = 0;
      this.source_bank = 0;

      this.union = new SNESJS.CPU.Channel.Union();

      this.indirect_bank = 0;
      this.hdma_addr = 0;
      this.line_counter = 0;
      this.unknown = 0;

      this.hdma_completed = false;
      this.hdma_do_transfer = false;
}

SNESJS.CPU.Channel.Union = function() {
      this.transfer_size = 0;
      this.indirect_addr = 0;
}