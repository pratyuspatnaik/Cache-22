import re

with open('frontend/signup.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add novalidate to forms
html = html.replace('<form id="signupForm">', '<form id="signupForm" novalidate>')
html = html.replace('<form id="step2Form">', '<form id="step2Form" novalidate>')

# Find all labels that are direct children of .form-group or .form-group style
# and replace them with the flex container.
# Exclude labels that already have complex HTML inside (like Password, Email, Org Email)
# The pattern is roughly: <label>Text</label>

def replace_label(match):
    full_match = match.group(0)
    label_text = match.group(1)
    
    # Generate an ID for the error span based on the label text
    base_id = re.sub(r'[^a-zA-Z]', '', label_text.replace('*', '').replace('?', '').replace('/', ''))
    base_id = base_id[0].lower() + base_id[1:]
    error_id = base_id + 'Error'
    
    error_msg = "Required"
    if "No." in label_text or "Pincode" in label_text or "OTP" in label_text or "Aadhar" in label_text:
        error_msg = "Invalid format"
    
    return f'''<div style="display: flex; justify-content: space-between; align-items: baseline;">
                                <label>{label_text}</label>
                                <span id="{error_id}" class="field-error" style="color: #dc3545; font-size: 0.75rem; display: none;">{error_msg}</span>
                            </div>'''

# Match simple <label>Text</label> that don't have nested tags (except maybe a class)
# We will just find <label>...</label> and replace if it doesn't contain a flex container already.
# Wait, Password has <label style="...">
html = re.sub(r'<label>([^<]+)</label>', replace_label, html)

with open('frontend/signup.html', 'w', encoding='utf-8') as f:
    f.write(html)
