"""W2-U2-2: one-command read for the outbound-click counter.

Prints clicks per product and per store for a date range, read from the
Workers KV namespace the out-click Pages Function (functions/api/out-click.js)
writes to under keys "click:<YYYY-MM-DD>:<store>:<pid>:<from>". Rows tagged
from=deploytest are counted separately and left out of the real totals.

Needs a Cloudflare API token scoped for Workers KV Storage:Read (the current
Calmkept Automation vault token is Pages:Edit + DNS/Zone:Edit only and cannot
read KV -- see W2-U2-2.done). Until that token exists, this script is staged
and syntax-checked only, not run against a live namespace.

Both namespaces now exist (Cowork, dashboard, 2026-11-11 11:02 ET):
  calmkept-out-clicks          (Production) d3a85ac915fb4265a9d82d68608cf5c1
  calmkept-out-clicks-preview  (Preview)    00a2b9ed6fea4bda9afab028f88f7b5d
Point KV_NAMESPACE_ID at the preview one to read test clicks made through a
preview deploy URL without touching production counts.

Usage:
  python3 scripts/read-out-clicks.py --from 2026-11-11 --to 2026-11-18

Env:
  CLOUDFLARE_API_TOKEN   required, KV Storage:Read scope
  CLOUDFLARE_ACCOUNT_ID  default 90d0f7e0c9ca450e4bc26537aa351542
  KV_NAMESPACE_ID        the namespace to read, e.g. 00a2b9ed6fea4bda9afab028f88f7b5d
                         for preview or d3a85ac915fb4265a9d82d68608cf5c1 for production

Fallback, no token with KV scope: open the Cloudflare dashboard -> Workers &
Pages -> KV -> the namespace above -> its keys, and read click:<date>:<store>:
<pid>:<from> and its value by hand. That is condition (a)'s accepted
substitute for this one command (Edith, opus-gate-night-2026-11-11.md condition
(a) ruling) when no KV-scoped token is available.
"""
import argparse
import json
import os
import sys
import urllib.request

API = "https://api.cloudflare.com/client/v4"
DEFAULT_ACCOUNT_ID = "90d0f7e0c9ca450e4bc26537aa351542"


def cf_get(path, token):
    req = urllib.request.Request(API + path, headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def list_keys(account_id, namespace_id, token):
    keys = []
    cursor = None
    while True:
        path = f"/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/keys?prefix=click:&limit=1000"
        if cursor:
            path += f"&cursor={cursor}"
        data = cf_get(path, token)
        if not data.get("success"):
            sys.exit(f"KV list_keys failed: {data.get('errors')}")
        keys.extend(k["name"] for k in data.get("result", []))
        cursor = (data.get("result_info") or {}).get("cursor")
        if not cursor:
            break
    return keys


def get_value(account_id, namespace_id, key, token):
    req = urllib.request.Request(
        f"{API}/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/{key}",
        headers={"Authorization": "Bearer " + token},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="date_from", required=True)
    ap.add_argument("--to", dest="date_to", required=True)
    args = ap.parse_args()

    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", DEFAULT_ACCOUNT_ID)
    namespace_id = os.environ.get("KV_NAMESPACE_ID")
    if not token or not namespace_id:
        sys.exit(
            "CLOUDFLARE_API_TOKEN and KV_NAMESPACE_ID must be set "
            "(KV Storage:Read scope; see script docstring)"
        )

    keys = list_keys(account_id, namespace_id, token)
    by_product = {}
    by_store = {}
    deploytest_total = 0
    for key in keys:
        # click:<date>:<store>:<pid>:<from>
        _, day, store, pid, from_tag = key.split(":", 4)
        if not (args.date_from <= day <= args.date_to):
            continue
        n = int(get_value(account_id, namespace_id, key, token) or "0")
        if from_tag == "deploytest":
            deploytest_total += n
            continue
        by_product[pid] = by_product.get(pid, 0) + n
        by_store[store] = by_store.get(store, 0) + n

    print(f"Outbound clicks {args.date_from}..{args.date_to}")
    print("\nBy product:")
    for pid, n in sorted(by_product.items(), key=lambda x: -x[1]):
        print(f"  {pid}: {n}")
    print("\nBy store:")
    for store, n in sorted(by_store.items(), key=lambda x: -x[1]):
        print(f"  {store}: {n}")
    print(f"\ndeploytest (left out of the totals above): {deploytest_total}")


if __name__ == "__main__":
    main()
