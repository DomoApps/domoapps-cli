import { expect } from 'chai';
// import request = require('request-promise');
import { Suite } from 'mocha';

interface DeviceAuthResponse {
  body: {
    device_code: string;
    user_code: string;
    verification_uri: string;
  };
}

interface TokenResponse {
  body: { access_token: string; refresh_token: string };
}

describe('When testing Utils', function (this: Suite) {
  it('the oauth endpoint should return appropriate tokens', (done: () => void) => {
    const appId = 'bb7815f9-13a7-4f49-ad4d-0d9cf5984acc';
    cy.request({
      method: 'POST',
      url: 'https://domo-es.domo.com/api/oauth2/device_authorization',
      form: true,
      body: {
        client_id: `domo:ryuu:${appId}`,
        scope: 'domoapps',
      },
    }).then(async (response: DeviceAuthResponse) => {
      const { device_code, user_code, verification_uri } = response.body;
      const email = 'Auto_Integration_Test_User@domo.com';
      const pwd = 'D@modomo';
      cy.visit(`${verification_uri}?user_code=${user_code}`);
      cy.get('input[type="text"]').type(email);
      cy.get('input[type="password"]').type(pwd);
      cy.get('.sign-in').click();
      cy.wait(500);
      // cy.get('#grantAccess').click();

      cy.request({
        method: 'GET',
        url: `https://domo-es.domo.com/domoapps/admin/device-registration/${appId}?scope=domoapps&device_code=${device_code}`,
        headers: {
          'content-type': 'application/json',
        },
      }).then((tokenResponse: TokenResponse) => {
        expect(tokenResponse.body.access_token).to.not.be.undefined;
        expect(tokenResponse.body.refresh_token).to.not.be.undefined;
        expect(tokenResponse.body.access_token).to.have.length.gt(0);
        expect(tokenResponse.body.refresh_token).to.have.length.gt(0);
        expect(typeof tokenResponse.body.access_token).to.equal('string');
        expect(typeof tokenResponse.body.refresh_token).to.equal('string');
        done();
      });
    });
  });
});
