import { Accounts } from 'meteor/accounts-base';
// RocketChat.setUserAvatar
// RocketChat.authz.addUserRoles
import {
	setUserAvatar,
} from '../../lib';
import {
	addUserRoles
} from '../../authorization';
Accounts.registerLoginHandler( 'login', function(loginRequest) {
	if (loginRequest.user && loginRequest.user.email && loginRequest.password) {
		loginRequest.email = loginRequest.user.email;
		loginRequest.pwd = loginRequest.password;
	}
	if (!loginRequest.email || !loginRequest.pwd) {
		return null;
	}

	const response = HTTP.call('POST', `${Meteor.settings.endpoint}/${Meteor.settings.module}/person/authenticatetoken`, {
		params: {
			'email': loginRequest.email,
			'pwd': loginRequest.pwd,
			'tokenName': 'chat'
		}
	});

	if (response && response.data && response.data.result === true && response.data.id) {

		let userId = null;
		let retourId = null;

		if (response.data.id && response.data.id.$id) {
			retourId = response.data.id.$id;
		} else {
			retourId = response.data.id;
		}


      //ok valide
		const userM = Meteor.users.findOne({'_id':retourId});

		const token = response.data.token ? response.data.token : false;
		if (userM) {

			userId= userM._id;
			if (token) {
				Meteor.users.update(userId, {
					$set: {
						token
					}
				});
			}

			Meteor.users.update(userId, {$set: {name: response.data.account.name,
				emails: [{ address: response.data.account.email, verified: true }]}});

		} else {
        //Meteor.user n'existe pas
        //username ou emails

			const newUser = {
				_id: retourId,
				username: response.data.account.username,
				name: response.data.account.name,
				emails: [{ address: response.data.account.email, verified: true }],
				createdAt: new Date(),
				active: true,
				type: 'user',
				globalRoles: ['user']
			};

			let roles = [];

      	if (Match.test(newUser.globalRoles, [String]) && newUser.globalRoles.length > 0) {
      		roles = roles.concat(newUser.globalRoles);
      	}

      	delete newUser.globalRoles;


			userId = Meteor.users.insert(newUser);
			if (token) {
				Meteor.users.update(userId, {
					$set: {
						token
					}
				});
			}
			if (response.data.account.email==='thomas.craipeau@gmail.com') {
				roles.push('admin');
			}

			addUserRoles(retourId, roles);
		}


		const stampedToken = Accounts._generateStampedLoginToken();
		Meteor.users.update(userId,
        {$push: {'services.resume.loginTokens': stampedToken}}
	  );
	  hashedToken = Accounts._hashLoginToken(stampedToken.token);
	  Accounts._insertHashedLoginToken(userId, {
	  	hashedToken
	  });
		this.setUserId(userId);
		const userR = Meteor.users.findOne({'_id':userId});
		if (response.data.account.profilThumbImageUrl) {
			setUserAvatar({ _id: userId, username: userR.username }, `${ Meteor.settings.urlimage }${ response.data.account.profilThumbImageUrl }`, '', 'url');
		}

		return {
			userId,
			token: stampedToken.token
		};
	} else if (response && response.data && response.data.result === false) {
		throw new Meteor.Error(Accounts.LoginCancelledError.numericError, response.data.msg);
	} else if (response && response.data && response.data.result === true && response.data.msg) {
		throw new Meteor.Error(response.data.msg);
	}
});

Meteor.server.method_handlers['loginco'] = function (loginRequest) {

	if (loginRequest.user && loginRequest.user.email && loginRequest.password) {
		loginRequest.email = loginRequest.user.email;
		loginRequest.pwd = loginRequest.password;
	}
	if (!loginRequest.email || !loginRequest.pwd) {
		return null;
	}

	const response = HTTP.call('POST', `${Meteor.settings.endpoint}/${Meteor.settings.module}/person/authenticatetoken`, {
		params: {
			'email': loginRequest.email,
			'pwd': loginRequest.pwd,
			'tokenName': 'chat'
		}
	});

	if (response && response.data && response.data.result === true && response.data.id) {

		let userId = null;
		let retourId = null;

		if (response.data.id && response.data.id.$id) {
			retourId = response.data.id.$id;
		} else {
			retourId = response.data.id;
		}


		//ok valide
		const userM = Meteor.users.findOne({
			'_id': retourId
		});

		const token = response.data.token ? response.data.token : false;
		if (userM) {
			//Meteor.user existe
			userId = userM._id;
			if (token) {
				Meteor.users.update(userId, {
					$set: {
						token
					}
				});
			}

			Meteor.users.update(userId, {
				$set: {
					name: response.data.account.name,
					emails: [{
						address: response.data.account.email,
						verified: true
					}]
				}
			});

		} else {
			//Meteor.user n'existe pas
			//username ou emails

			const newUser = {
				_id: retourId,
				username: response.data.account.username,
				name: response.data.account.name,
				emails: [{
					address: response.data.account.email,
					verified: true
				}],
				createdAt: new Date(),
				active: true,
				type: 'user',
				globalRoles: ['user']
			};

			let roles = [];

			if (Match.test(newUser.globalRoles, [String]) && newUser.globalRoles.length > 0) {
				roles = roles.concat(newUser.globalRoles);
			}

			delete newUser.globalRoles;


			userId = Meteor.users.insert(newUser);
			if (token) {
				Meteor.users.update(userId, {
					$set: {
						token
					}
				});
			}
			if (response.data.account.email === 'thomas.craipeau@gmail.com') {
				roles.push('admin');
			}

			addUserRoles(retourId, roles);
		}


		const stampedToken = Accounts._generateStampedLoginToken();
		Meteor.users.update(userId, {
			$push: {
				'services.resume.loginTokens': stampedToken
			}
		});
		
		hashedToken = Accounts._hashLoginToken(stampedToken.token);
		Accounts._insertHashedLoginToken(userId, {
			hashedToken
		});

		this.setUserId(userId);
		const userR = Meteor.users.findOne({
			'_id': userId
		});
		if (response.data.account.profilThumbImageUrl) {
			setUserAvatar({
				_id: userId,
				username: userR.username
			}, `${ Meteor.settings.urlimage }${ response.data.account.profilThumbImageUrl }`, '', 'url');
		}
		// console.log(userId);
		return {
			id: userId,
			userId,
			token: stampedToken.token
		};
	} else if (response && response.data && response.data.result === false) {
		throw new Meteor.Error(Accounts.LoginCancelledError.numericError, response.data.msg);
	} else if (response && response.data && response.data.result === true && response.data.msg) {
		throw new Meteor.Error(response.data.msg);
	}
};