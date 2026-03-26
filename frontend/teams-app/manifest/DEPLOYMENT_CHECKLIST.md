# KBC Attendance Teams Deployment Checklist

## Upload package

1. Use the ready-to-upload ZIP package generated from this repo.
2. In Teams Admin Center, go to `Teams apps > Manage apps`.
3. Confirm custom app upload is allowed for the target tenant.
4. Upload the package as a custom app.
5. Verify the app status is `Allowed`.
6. If the app was already installed, update the uploaded package to the new version instead of creating a second app ID.
7. Wait for the updated manifest to propagate before testing in Teams clients.

## Package contents

The upload package must contain only these files at ZIP root:

- `manifest.json`
- `color.png`
- `outline.png`

## Teams Admin Center checks

Check these before guest or anonymous testing:

- `Users > Guest access`: Guest access must be `On`.
- `Teams apps > Manage apps`: `KBC Attendance` must be `Allowed`.
- `Teams apps > Permission policies`: target users must be allowed to use custom apps.
- `Meetings > Meeting settings`: `Anonymous participants can interact with apps in meetings` must be `On` if anonymous meeting testing is required.
- Shared channel cross-tenant testing depends on Microsoft Entra cross-tenant access and Teams shared channel configuration being enabled between organizations.

## What the admin must enable

- Guest access for the tenant.
- Custom app upload or app availability through the relevant app permission policy.
- Anonymous meeting app interaction if anonymous participants must use the meeting app.
- Shared channel and cross-tenant collaboration settings if shared-channel external testing is required.

## What a member or organizer must do before a guest can use the app

- For team and channel scenarios, an internal member or owner must add the app first.
- For private and shared channels, the app must be added to that specific channel. Host-team installation alone is not enough.
- For group chat tabs, an internal participant must add the tab first.
- For meeting scenarios, an organizer or presenter must add the app to the meeting surface before guests or anonymous users can interact with it.
- Guests can use supported tabs that are already available to them, but they should not be the assumed installer or manager of the app.

## Guest testing checklist

- Guest account is accepted and visible as a Teams guest in the tenant.
- Guest is added to at least one target team.
- App is already uploaded and allowed in the tenant.
- App is added by an internal member to the target team, channel, chat, or meeting.
- Guest can see the app in supported surfaces and open the QR panel without a blank page.
- Browser console shows user category and host surface diagnostics.

## Anonymous testing checklist

- Use a real meeting, not a simulated browser-only tab load.
- Join from a private browser window or another client as an anonymous participant.
- Ensure the app was already added to the meeting by an organizer or presenter.
- Confirm `Anonymous participants can interact with apps in meetings` is enabled in Teams Admin Center.
- Validate that anonymous users can open supported meeting surfaces but cannot manage app installation.

## External or federated testing notes

- External or federated users are not the same as B2B guests.
- External/federated users do not get normal team or channel guest access automatically.
- Meeting support depends on Teams meeting platform support for that user type.
- Shared channels use a different cross-tenant model from guest access and require host-tenant and cross-tenant configuration.

## Expected to work

- Internal members in standard team/channel tabs.
- Internal members in group chat tabs.
- B2B guests in supported team, channel, and group chat tabs once the app is already added and tenant policy allows it.
- Internal members and B2B guests in supported meeting surfaces where the app has already been added.
- Anonymous participants in supported meeting surfaces only, when Teams meeting policy allows app interaction.

## Expected not to work or not fully supported

- Anonymous users adding or managing apps themselves.
- Team or channel tab access for external/federated users through normal external access alone.
- Meeting apps in shared-channel meetings, because Teams does not support meeting apps there.
- Direct app installation from incoming shared-channel locations.
- Private-channel availability without adding the app to that private channel.

## Known Teams platform limitations

- Shared-channel meeting apps are not supported by Teams.
- Private-channel app support is still public developer preview.
- Shared and private channels require per-channel app addition.
- Anonymous users can only interact with apps already present in the meeting.
- External/federated access is a different platform capability from guest access and has different limits.

## Release sign-off

Confirm all of the following before handoff:

- Manifest version and app version are correct.
- ZIP package contains only the required files.
- Frontend production build passes.
- Team, chat, and meeting testers are identified.
- Tenant admin has reviewed the policy prerequisites above.
