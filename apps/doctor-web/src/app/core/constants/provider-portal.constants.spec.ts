import { providerPortalForHost } from './provider-portal.constants';

describe('providerPortalForHost', () => {
  it('uses Professional Help for earn and support hosts', () => {
    expect(providerPortalForHost('earn.hopehub.in').id).toBe('HOPE_HUB');
    expect(providerPortalForHost('support.hopehub.in').id).toBe('HOPE_HUB');
  });

  it('uses Homeopathy Doctor for the doctor host', () => {
    const portal = providerPortalForHost('doctor.hopehub.in');
    expect(portal.id).toBe('HOMEOPATHY');
    expect(portal.language.providerTitle).toBe('Homeopathy Doctor');
    expect(portal.requiresCredentialApproval).toBe(true);
  });

  it('allows local previews without allowing production query overrides', () => {
    expect(providerPortalForHost('localhost', 'doctor').id).toBe('HOMEOPATHY');
    expect(providerPortalForHost('earn.hopehub.in', 'doctor').id).toBe('HOPE_HUB');
  });
});
