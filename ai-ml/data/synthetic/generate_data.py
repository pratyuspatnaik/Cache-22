import pandas as pd
import numpy as np
import os
import random

def generate_synthetic_data(num_farmers=50, num_buyers=20):
    commodities = ['Tomato', 'Paddy(Common)', 'Cauliflower']
    varieties = {'Tomato': ['Local', 'Hybrid'], 'Paddy(Common)': ['B P T', 'Other'], 'Cauliflower': ['FAQ', 'Other']}
    
    # Base coordinates (Using Bhubaneswar region as a center point)
    base_lat, base_lon = 20.2961, 85.8245 

    # --- GENERATE FARMERS ---
    farmers = []
    for i in range(1, num_farmers + 1):
        crop = random.choice(commodities)
        variety = random.choice(varieties[crop])
        
        farmers.append({
            'farmer_id': f"F{i:03d}",
            'name': f"Farmer_{i}",
            'latitude': round(base_lat + random.uniform(-0.5, 0.5), 4),
            'longitude': round(base_lon + random.uniform(-0.5, 0.5), 4),
            'commodity': crop,
            'variety': variety,
            'grade': 'FAQ',
            'quantity_qtl': random.randint(10, 100),
            'expected_price_per_qtl': random.randint(1500, 2500) 
        })
    df_farmers = pd.DataFrame(farmers)

    # --- GENERATE BUYERS ---
    buyers = []
    buyer_types = ['Restaurant Chain', 'Kirana Aggregator', 'Food Processor']
    
    for i in range(1, num_buyers + 1):
        crop = random.choice(commodities)
        variety = random.choice(varieties[crop])
        
        buyers.append({
            'buyer_id': f"B{i:03d}",
            'buyer_name': f"Buyer_{i}_{random.choice(['Foods', 'Mart', 'Kitchens'])}",
            'buyer_type': random.choice(buyer_types),
            'latitude': round(base_lat + random.uniform(-0.2, 0.2), 4), 
            'longitude': round(base_lon + random.uniform(-0.2, 0.2), 4),
            'commodity': crop,
            'variety': variety,
            'grade': 'FAQ',
            'min_quantity_qtl': random.randint(5, 20),
            'max_quantity_qtl': random.randint(50, 200),
            'offered_price_per_qtl': random.randint(1800, 3000), 
            'reliability_score': round(random.uniform(7.0, 10.0), 1)
        })
    df_buyers = pd.DataFrame(buyers)

    # --- SAVE TO CSV ---
    os.makedirs("ai-ml/data/synthetic", exist_ok=True) 
    df_farmers.to_csv("ai-ml/data/synthetic/farmers.csv", index=False)
    df_buyers.to_csv("ai-ml/data/synthetic/buyers.csv", index=False)
    print("✅ Synthetic data created: farmers.csv and buyers.csv")

if __name__ == "__main__":
    generate_synthetic_data()