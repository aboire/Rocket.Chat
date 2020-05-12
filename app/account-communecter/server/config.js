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

	if (loginRequest && loginRequest.resume) {

			const hashedToken = Accounts._hashLoginToken(loginRequest.resume);

			let user = Meteor.users.findOne(
				{ "services.resume.loginTokens.hashedToken": hashedToken },
				{ fields: { "services.resume.loginTokens.$": 1 } });

			if (!user) {

				user = Meteor.users.findOne({
					$or: [
						{ "services.resume.loginTokens.hashedToken": hashedToken },
						{ "services.resume.loginTokens.token": loginRequest.resume }
					]
				},
					// Note: Cannot use ...loginTokens.$ positional operator with $or query.
					{ fields: { "services.resume.loginTokens": 1 } });
			}

			if (!user)
				return {
					error: new Meteor.Error(403, "You've been logged out by the server. Please log in again.")
				};

			let oldUnhashedStyleToken;
			let token = user.services.resume.loginTokens.find(token =>
				token.hashedToken === hashedToken
			);
			if (token) {
				oldUnhashedStyleToken = false;
			} else {
				token = user.services.resume.loginTokens.find(token =>
					token.token === loginRequest.resume
				);
				oldUnhashedStyleToken = true;
			}

			const tokenExpires = Accounts._tokenExpiration(token.when);
			if (new Date() >= tokenExpires)
				return {
					userId: user._id,
					error: new Meteor.Error(403, "Your session has expired. Please log in again.")
				};


			if (oldUnhashedStyleToken) {
				Meteor.users.update(
					{
						_id: user._id,
						"services.resume.loginTokens.token": loginRequest.resume
					},
					{
						$addToSet: {
							"services.resume.loginTokens": {
								"hashedToken": hashedToken,
								"when": token.when
							}
						}
					}
				);

				Meteor.users.update(user._id, {
					$pull: {
						"services.resume.loginTokens": { "token": loginRequest.resume }
					}
				});
			}

			return {
				id: user._id,
				userId: user._id,
				token: loginRequest.resume,
				when: token.when
			};
		

		/*const userM = Meteor.users.findOne({
			'services.resume.loginTokens.token': loginRequest.resume
		});

		if (userM) {
			const userId = userM._id;

			const stampedToken = Accounts._generateStampedLoginToken();
			Meteor.users.update(userId, {
				$push: {
					'services.resume.loginTokens': stampedToken
				}
			});

			const hashedToken = Accounts._hashLoginToken(stampedToken.token);
			Accounts._insertHashedLoginToken(userId, {
				hashedToken
			});

			this.setUserId(userId);
			const userR = Meteor.users.findOne({
				'_id': userId
			});

			return {
				id: userId,
				userId,
				token: stampedToken.token,
				tokenExpires: Accounts._tokenExpiration(stampedToken.when)
			};

			} else {
			throw new Meteor.Error('error');
			}*/

	}

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
			token: stampedToken.token,
			tokenExpires: Accounts._tokenExpiration(stampedToken.when)
		};
	} else if (response && response.data && response.data.result === false) {
		throw new Meteor.Error(Accounts.LoginCancelledError.numericError, response.data.msg);
	} else if (response && response.data && response.data.result === true && response.data.msg) {
		throw new Meteor.Error(response.data.msg);
	}
};