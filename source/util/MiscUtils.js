//Code taken and modified from http://stackoverflow.com/questions/359788/how-to-execute-a-javascript-function-when-i-have-its-name-as-a-string
function getFunctionByName(functionName) {
	var context = window;
	var args = Array.prototype.slice.call(arguments).splice(2);
	var namespaces = functionName.split(".");
	var func = namespaces.pop();
	for(var i = 0; i < namespaces.length; i++) {
    	context = context[namespaces[i]];
	}
	return context[func];
}