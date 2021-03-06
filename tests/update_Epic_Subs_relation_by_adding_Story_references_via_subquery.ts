import {test, assetApiPost} from '../lib/asset-api-helper';

const types = ['yaml', 'json'];

for(const type of types) {
    test(`Update Epic, changing its Subs relation by adding Story references via subquery (${type})`, async t => {
        const setupCommand = `
from: Scope:0
update:
 Workitems:
 - AssetType: Story
   Name: Story 1
 - AssetType: Story
   Name: Story 2
 - AssetType: Story
   Name: Story 3
 - AssetType: Epic
   Name: Epic that will get new Subs
`;
        let res = await assetApiPost(setupCommand);
        t.is(res.status, 200, "Expected 200 OK");
        t.is(res.data.assetsCreated.count, 4, "Expected 4 Assets to be created");
        const [story1OidToken, story2OidToken, story3OidToken, epicOidToken] = res.data.assetsCreated.oidTokens;

        const commands = {
                yaml: `
from: ${epicOidToken}
update:
 Subs:
  add:
   from: Story
   filter:
   - ID='${story1OidToken}','${story2OidToken}','${story3OidToken}'
`,
                json: `
{
  "from": "${epicOidToken}",
  "update": {
    "Subs": {
      "add": {
        "from": "Story",
        "filter": [
          "ID='${story1OidToken}','${story2OidToken}','${story3OidToken}'"
        ]
      }
    }
  }
}`
        };

        const payload = commands[type];

        res = await assetApiPost(payload, type);
        t.is(res.status, 200, "Expected 200 OK");
        t.is(res.data.assetsModified.count, 1, "Expected 1 Assets to be modified");

        const query = `
from: ${epicOidToken}
select:
- Name
- Subs
`;

        const verifyExpectation = [[
            {
              "Name": "Epic that will get new Subs",
              "Subs": [
                {
                    _oid: `${story1OidToken}`
                },
                {
                    _oid: `${story2OidToken}`
                },
                {
                    _oid: `${story3OidToken}`
                }
              ],
              "_oid": `${epicOidToken}`
            }
        ]];

        const verfication = await assetApiPost(query);
        t.deepEqual(verfication.data.queryResult.results, verifyExpectation);
    });
}