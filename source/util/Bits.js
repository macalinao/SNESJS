function uclip24(num) {
	return num & 0xffffff;
}

function uclip16(num) {
	return num & 0xffff;
}

function uclip8(num) {
	return num & 0xff;
}