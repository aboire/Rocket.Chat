import { Meteor } from 'meteor/meteor';
import { Match } from 'meteor/check';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/tap:i18n';
import { HTTP } from 'meteor/http';

import { slashCommands } from '../../utils';

const apiCommunecter = {};

const callPixelRest = (token, method, controller, action, post) => {
	const responsePost = HTTP.call(method, `${ Meteor.settings.endpoint }/${ controller }/${ action }`, {
		headers: {
			'X-Auth-Token': token,
			'X-User-Id': Meteor.userId(),
			'X-Auth-Name': 'chat',
		},
		params: post,
		npmRequestOptions: {
			jar: true,
		},
	});
	// console.log(responsePost);
	if (responsePost && responsePost.data && responsePost.data.result) {
		return responsePost;
	}
	if (responsePost && responsePost.data && responsePost.data.msg) {
		// console.log(responsePost);
		throw new Meteor.Error('error_call', responsePost.data.msg);
	} else {
		throw new Meteor.Error('error_server', 'error server');
	}
};

apiCommunecter.postPixel = function(controller, action, params) {
	const userC = Meteor.users.findOne({
		_id: Meteor.userId(),
	});
	if (userC && userC.token) {
		const retour = callPixelRest(userC.token, 'POST', controller, action, params);
		return retour;
	}
	throw new Meteor.Error('Error identification');
};


function coTest(command, params, item) {
	if (command !== 'cotest' || !Match.test(params, String)) {
		return;
	}
	const username = params.trim().replace('@', '');
	if (username === '') {
		return;
	}
	const userId = Meteor.userId();
	const user = Meteor.users.findOne(userId);

	
}

slashCommands.add('cotest', coTest, {
	description: 'co test',
	params: '@username',
});
