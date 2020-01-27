import { slashCommands } from '../../utils';
// co
/*

*/
slashCommands.add('cotest', function (command, params) {
	const username = params.trim();
	if (username === '') {
		return;
	}
	return username.replace('@', '');
}, {
	description: 'co test',
	params: '@username',
});
