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

var PORT_1 = 0;
var PORT_2 = 1;

var DEVICE_NONE = 0;
var DEVICE_JOYPAD = 1;
var DEVICE_MULTITAP = 2;
var DEVICE_MOUSE = 3;
var DEVICE_SUPERSCOPE = 4;
var DEVICE_JUSTIFIER = 5;
var DEVICE_JUSTIFIERS = 6;

var JOYPAD_B = 1 << 0;
var JOYPAD_Y = 1 << 1;
var JOYPAD_SELECT = 1 << 2;
var JOYPAD_START = 1 << 3;
var JOYPAD_UP = 1 << 4;
var JOYPAD_DOWN = 1 << 5;
var JOYPAD_LEFT = 1 << 6;
var JOYPAD_RIGHT = 1 << 7;
var JOYPAD_A = 1 << 8;
var JOYPAD_X = 1 << 9;
var JOYPAD_L = 1 << 10;
var JOYPAD_R = 1 << 11;

var MOUSE_X = 1 << 0;
var MOUSE_Y = 1 << 1;
var MOUSE_LEFT = 1 << 2;
var MOUSE_RIGHT = 1 << 3;

var SUPERSCOPE_X = 1 << 0;
var SUPERSCOPE_Y = 1 << 1;
var SUPERSCOPE_TRIGGER = 1 << 2;
var SUPERSCOPE_CURSOR = 1 << 3;
var SUPERSCOPE_TURBO = 1 << 4;
var SUPERSCOPE_PAUSE = 1 << 5;

var JUSTIFIER_X = 1 << 0;
var JUSTIFIER_Y = 1 << 1;
var JUSTIFIER_TRIGGER = 1 << 2;
var JUSTIFIER_START = 1 << 3;

var REGION_NTSC = 0;
var REGION_PAL = 1;

var MEMORYTYPE_RAM = 0;
var MEMORYTYPE_RTC = 1;
var MEMORYTYPE_BSXRAM = 2;
var MEMORYTYPE_BSXPRAM = 3;
var MEMORYTYPE_SUFAMITURBOARAM = 4;
var MEMORYTYPE_SUFAMITURBOBRAM = 5;
var MEMORYTYPE_GAMEBOYRAM = 6;
var MEMORYTYPE_GAMEBOYRTC = 7;
