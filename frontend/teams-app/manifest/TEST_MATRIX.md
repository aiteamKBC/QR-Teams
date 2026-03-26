# KBC Attendance Teams Test Matrix

## Internal member

| Surface | Prerequisite | Expected result | Admin policy dependency | Teams platform dependency |
| --- | --- | --- | --- | --- |
| Team/channel tab | App uploaded and added to standard channel | Member sees app icon/tab and opens QR panel | Yes | Standard Teams tab support |
| Group chat tab | App added to group chat | Member sees tab and opens QR panel | Yes | Supported |
| Meeting chat tab | App added to meeting | Member sees tab and opens QR panel | Yes | Supported |
| Meeting details tab | App added to meeting | Member sees tab and opens QR panel | Yes | Supported |
| Meeting side panel | App added to meeting | Member sees side-panel experience and opens QR panel | Yes | Supported |

## B2B guest

| Surface | Prerequisite | Expected result | Admin policy dependency | Teams platform dependency |
| --- | --- | --- | --- | --- |
| Team/channel tab | Guest added to host team and app already added | Guest sees supported tab and opens QR panel | Yes | Supported for guest access when team membership exists |
| Private channel tab | Guest is a member of the private channel and app added to that channel | Guest sees supported tab and opens QR panel | Yes | Private channel tabs are preview support |
| Shared channel tab | Shared channel configured and app added to host channel | Guest-style B2B users are not the normal shared-channel model; validate only if tenant uses guest access in the host team | Yes | Shared channels use different cross-tenant model |
| Group chat tab | Guest is already part of the chat and app added by internal user | Guest sees tab and opens QR panel | Yes | Supported |
| Meeting chat tab | Guest joins meeting and app already added | Guest sees tab and opens QR panel | Yes | Supported |
| Meeting details tab | Guest joins meeting and app already added | Guest sees tab and opens QR panel | Yes | Supported |
| Meeting side panel | Guest joins meeting and app already added | Guest sees side panel and opens QR panel | Yes | Supported |

## Anonymous meeting participant

| Surface | Prerequisite | Expected result | Admin policy dependency | Teams platform dependency |
| --- | --- | --- | --- | --- |
| Team/channel tab | None | Not applicable | N/A | Not supported |
| Group chat tab | None | Not applicable | N/A | Not supported |
| Meeting chat tab | Anonymous app interaction enabled and app already added | Anonymous participant can open supported meeting app surface if exposed by Teams client | Yes | Supported only in eligible meeting contexts |
| Meeting details tab | Anonymous app interaction enabled and app already added | Anonymous participant can open the tab in supported clients | Yes | Supported only for meeting apps already present |
| Meeting side panel | Anonymous app interaction enabled and app already added | Anonymous participant opens QR panel in side panel | Yes | Supported in eligible meeting clients |

## External or federated participant

| Surface | Prerequisite | Expected result | Admin policy dependency | Teams platform dependency |
| --- | --- | --- | --- | --- |
| Team/channel tab | None | Not expected through normal external access | Yes | Not supported as guest-equivalent behavior |
| Group chat tab | Cross-org chat exists and app already shared where Teams allows it | Validate case-by-case; do not assume parity with guest | Yes | Depends on Teams cross-org app support |
| Meeting chat tab | Cross-org meeting and app already added | External participant can access supported meeting app surfaces | Yes | Supported per Teams meeting user-type matrix |
| Meeting details tab | Cross-org meeting and app already added | External participant can access supported meeting app surfaces | Yes | Supported per Teams meeting user-type matrix |
| Meeting side panel | Cross-org meeting and app already added | External participant can access supported meeting app surfaces | Yes | Supported per Teams meeting user-type matrix |

## Diagnostics to confirm during QA

- Console shows `Detected user category`.
- Console shows `Detected host surface`.
- Console shows `Teams load summary`.
- Console shows `Render decision`.
- If context is partial, the page renders a visible fallback notice instead of failing silently.
