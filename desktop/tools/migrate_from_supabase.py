#!/usr/bin/env python3
"""
Supabase to SQLite Migration Tool

Exports drug data from the Supabase PostgreSQL database and converts it
into a format suitable for importing into the OncoInfo desktop application's
SQLite database.

Usage:
    python migrate_from_supabase.py --url <SUPABASE_URL> --key <ANON_KEY> --output drugs.json

The output JSON file can then be imported using:
    OncoInfoSeed --import drugs.json --db oncoinfo.db

This tool helps transition from the cloud-based Supabase backend to the
standalone local database, which is essential for hospitals with restricted
internet access.
"""

import argparse
import json
import sys

try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)


def fetch_drugs(supabase_url: str, anon_key: str) -> list:
    """Fetch all drugs from Supabase REST API."""
    url = f"{supabase_url}/rest/v1/drugs"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Accept": "application/json",
    }
    params = {"select": "*", "is_archived": "eq.false", "order": "display_order"}

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()


def fetch_hospitals(supabase_url: str, anon_key: str) -> list:
    """Fetch all hospitals from Supabase."""
    url = f"{supabase_url}/rest/v1/hospitals_public"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Accept": "application/json",
    }
    params = {"select": "*", "is_active": "eq.true"}

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()


def fetch_patient_folder_content(supabase_url: str, anon_key: str) -> list:
    """Fetch patient folder content."""
    url = f"{supabase_url}/rest/v1/patient_folder_content"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Accept": "application/json",
    }
    params = {"select": "*"}

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()


def main():
    parser = argparse.ArgumentParser(description="Migrate data from Supabase to local JSON")
    parser.add_argument("--url", required=True, help="Supabase project URL")
    parser.add_argument("--key", required=True, help="Supabase anon/service key")
    parser.add_argument("--output", default="drugs.json", help="Output JSON file")
    parser.add_argument("--hospitals", action="store_true", help="Also export hospitals")
    parser.add_argument("--patient-folders", action="store_true", help="Also export patient folders")
    args = parser.parse_args()

    print(f"Connecting to Supabase: {args.url}")

    # Fetch drugs
    print("Fetching drugs...")
    drugs = fetch_drugs(args.url, args.key)
    print(f"  Found {len(drugs)} drugs")

    # Write drugs
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(drugs, f, indent=2, ensure_ascii=False)
    print(f"  Written to {args.output}")

    # Optionally fetch hospitals
    if args.hospitals:
        print("Fetching hospitals...")
        hospitals = fetch_hospitals(args.url, args.key)
        print(f"  Found {len(hospitals)} hospitals")
        with open("hospitals.json", "w", encoding="utf-8") as f:
            json.dump(hospitals, f, indent=2, ensure_ascii=False)
        print("  Written to hospitals.json")

    # Optionally fetch patient folders
    if args.patient_folders:
        print("Fetching patient folder content...")
        folders = fetch_patient_folder_content(args.url, args.key)
        print(f"  Found {len(folders)} patient folder entries")
        with open("patient_folders.json", "w", encoding="utf-8") as f:
            json.dump(folders, f, indent=2, ensure_ascii=False)
        print("  Written to patient_folders.json")

    print("\nMigration export complete!")
    print(f"\nTo import into OncoInfo desktop:")
    print(f"  OncoInfoSeed --import {args.output} --db path/to/oncoinfo.db")


if __name__ == "__main__":
    main()
