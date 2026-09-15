import requests
import pandas as pd

def fetch_agmarknet_live(api_key: str, limit: int = 100) -> pd.DataFrame:
    """
    Fetches live market records from data.gov.in AGMARKNET API.
    """
    resource_id = "9ef84268-d588-465a-a308-a864a43d0070"
    url = f"https://api.data.gov.in/resource/{resource_id}"
    
    params = {
        "api-key": api_key,
        "format": "json",
        "limit": limit
    }
    
    # Adding a browser-like User-Agent helps avoid automatic request blocking
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    try:
        print(f"Connecting to data.gov.in API (fetching up to {limit} records)...")
        response = requests.get(url, params=params, headers=headers, timeout=30)
        
        # Check HTTP status (200 = OK, 401 = Unauthorized/Invalid Key, 500/502 = Server Error)
        if response.status_code != 200:
            print(f"❌ Server returned error status code: {response.status_code}")
            print(f"Response: {response.text}")
            return pd.DataFrame()
            
        data = response.json()
        records = data.get("records", [])
        
        if not records:
            print("⚠️ Request succeeded, but the 'records' list was empty.")
            return pd.DataFrame()
            
        df = pd.DataFrame(records)
        # Standardize column names: lowercase with underscores
        df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
        
        print(f"✅ Success! Fetched {len(df)} live records.\n")
        return df
        
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 30 seconds. The server might be experiencing high load.")
        return pd.DataFrame()
    except requests.exceptions.RequestException as e:
        print(f"❌ Network/Request error: {e}")
        return pd.DataFrame()


if __name__ == "__main__":
    # Paste your working API key here
    YOUR_API_KEY = "579b464db66ec23bdd00000145c7e6aca1c14dcb7ac23b6f39d325de"
    
    df = fetch_agmarknet_live(api_key=YOUR_API_KEY, limit=100)
    
    if not df.empty:
        print("=" * 45)
        print(" LIVE AGMARKNET DATA ANALYSIS ")
        print("=" * 45)
        
        print(f"\n📋 Fields/Columns available in live API:")
        print(list(df.columns))
        
        # Find which column holds commodity/crop names
        commodity_col = next((col for col in df.columns if "commodity" in col or "crop" in col), None)
        state_col = next((col for col in df.columns if "state" in col), None)
        
        if commodity_col:
            print(f"\n🌾 Sample Crops currently reporting ({commodity_col}):")
            print(df[commodity_col].unique()[:10])
            
        if state_col:
            print(f"\n📍 Sample States currently reporting ({state_col}):")
            print(df[state_col].unique()[:5])
            
        print("\n🔍 First 2 sample records:")
        print(df.head(2).to_dict(orient="records"))