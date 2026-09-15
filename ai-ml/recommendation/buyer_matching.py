import pandas as pd
import numpy as np
import math

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculates distance in km between two GPS coordinates using the Haversine formula.
    """
    R = 6371  # Earth radius in km
    
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def recommend_buyers_for_farmer(farmer_id, farmers_csv, buyers_csv):
    """
    Finds and ranks the best buyers for a specific farmer.
    """
    # 1. Load the data
    df_farmers = pd.read_csv(farmers_csv)
    df_buyers = pd.read_csv(buyers_csv)
    
    # Get the specific farmer's details
    farmer = df_farmers[df_farmers['farmer_id'] == farmer_id]
    if farmer.empty:
        return "Farmer not found."
    farmer = farmer.iloc[0]
    
    print(f"\n🌾 Farmer Profile: {farmer['name']} | Crop: {farmer['commodity']} ({farmer['variety']}) | Qty: {farmer['quantity_qtl']} qtl")
    
    # 2. FILTERING (Hard constraints)
    # The buyer MUST want the same crop and variety
    valid_buyers = df_buyers[
        (df_buyers['commodity'] == farmer['commodity']) & 
        (df_buyers['variety'] == farmer['variety'])
    ].copy()
    
    # The buyer MUST be able to accept the farmer's quantity
    valid_buyers = valid_buyers[
        (valid_buyers['min_quantity_qtl'] <= farmer['quantity_qtl']) & 
        (valid_buyers['max_quantity_qtl'] >= farmer['quantity_qtl'])
    ]
    
    if valid_buyers.empty:
        return "\n❌ No valid buyers found for this crop and quantity right now."
        
    # 3. SCORING ENGINE
    results = []
    
    # Define max values to normalize scores to a 0-1 scale
    max_price = valid_buyers['offered_price_per_qtl'].max()
    
    for _, buyer in valid_buyers.iterrows():
        # A. Calculate Distance
        distance_km = calculate_distance(
            farmer['latitude'], farmer['longitude'], 
            buyer['latitude'], buyer['longitude']
        )
        
        # B. Calculate individual component scores (0 to 1)
        price_score = buyer['offered_price_per_qtl'] / max_price
        
        # Closer is better (assume max acceptable distance is roughly 100km)
        distance_score = max(0, 1 - (distance_km / 100)) 
        
        reliability_score = buyer['reliability_score'] / 10.0
        
        # C. Apply Weights (This is the "Decision Intelligence")
        # 50% Price, 30% Distance, 20% Reliability
        final_score = (price_score * 0.50) + (distance_score * 0.30) + (reliability_score * 0.20)
        final_score = round(final_score * 100, 1) # Convert to out of 100
        
        results.append({
            'Buyer Name': buyer['buyer_name'],
            'Type': buyer['buyer_type'],
            'Offered Price (qtl)': f"₹{buyer['offered_price_per_qtl']}",
            'Distance (km)': round(distance_km, 1),
            'Reliability': buyer['reliability_score'],
            'MATCH SCORE': final_score
        })
        
    # 4. Sort and return top 3
    df_results = pd.DataFrame(results)
    df_results = df_results.sort_values(by='MATCH SCORE', ascending=False).head(3)
    
    print("\n✅ Top 3 Recommended Buyers:")
    print(df_results.to_string(index=False))
    return df_results

if __name__ == "__main__":
    # Test the engine with Farmer 1
    recommend_buyers_for_farmer(
        farmer_id='F001', 
        farmers_csv='ai-ml/data/synthetic/farmers.csv', 
        buyers_csv='ai-ml/data/synthetic/buyers.csv'
    )