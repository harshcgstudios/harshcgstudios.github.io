import os
import sys
import nrrd
import numpy as np
import scipy.ndimage as ndimage

def load_nrrd_with_endian_fix(filepath):
    with open(filepath, 'rb') as f:
        content = f.read()
        
    # Find double newline that separates header from raw data
    header_end = content.find(b'\n\n')
    if header_end == -1:
        header_end = content.find(b'\r\n\r\n')
        if header_end == -1:
            raise ValueError("Could not find end of NRRD header.")
        sep_double = b'\r\n\r\n'
    else:
        sep_double = b'\n\n'
        
    header_bytes = content[:header_end]
    data_bytes = content[header_end + len(sep_double):]
    
    header_str = header_bytes.decode('utf-8', errors='ignore')
    
    # Inject endian field if missing
    if 'endian:' not in header_str:
        print("  -> Fixing missing 'endian' field in header...")
        header_lines = header_str.split('\n')
        # Insert 'endian: little' as the second line
        header_lines.insert(1, "endian: little")
        header_str = '\n'.join(header_lines)
        
    fixed_bytes = header_str.encode('utf-8') + sep_double + data_bytes
    
    # Write to a temporary file to bypass pynrrd file-like object restrictions
    temp_path = filepath + ".tmp"
    with open(temp_path, 'wb') as tmp_f:
        tmp_f.write(fixed_bytes)
        
    try:
        data, header = nrrd.read(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    return data, header

def upsample_volume(input_path, output_path, z_factor=4.0):
    print(f"Loading {input_path}...")
    data, header = load_nrrd_with_endian_fix(input_path)
    
    print(f"Original Shape: {data.shape}")
    print(f"Original Header: {header}")
    
    # Zoom factors: Zoom only along the Z-axis (axis 2 in shape (X, Y, Z))
    zoom_factors = (1.0, 1.0, z_factor)
    
    print(f"Upsampling Z-axis by 4x using cubic spline interpolation...")
    data_zoomed = ndimage.zoom(data, zoom_factors, order=3)
    
    print(f"New Shape: {data_zoomed.shape}")
    
    # Update size in header
    header['sizes'] = np.array(data_zoomed.shape)
    
    # Update space directions (voxel spacing direction matrix)
    if 'space directions' in header:
        space_dirs = header['space directions']
        if space_dirs is not None:
            space_dirs = np.array(space_dirs, dtype=float)
            space_dirs[2] = space_dirs[2] / z_factor
            header['space directions'] = space_dirs
            print(f"Updated space directions: {space_dirs}")
            
    header['encoding'] = 'gzip'
    
    print(f"Writing upsampled volume to {output_path}...")
    nrrd.write(output_path, data_zoomed, header)
    print(f"[SUCCESS] Wrote upsampled dataset to {output_path}\n")

if __name__ == "__main__":
    models_dir = r"D:\AI\Antigravity\website\anatomy\models"
    
    # Upsample Male
    male_in = os.path.join(models_dir, "visible_human_whole_body.nrrd")
    male_out = os.path.join(models_dir, "visible_human_whole_body_highres.nrrd")
    if os.path.exists(male_in):
        try:
            upsample_volume(male_in, male_out, z_factor=4.0)
        except Exception as e:
            print(f"Failed to upsample male: {e}")
    else:
        print(f"Error: {male_in} not found.")
        
    # Upsample Female
    female_in = os.path.join(models_dir, "visible_human_female_whole_body.nrrd")
    female_out = os.path.join(models_dir, "visible_human_female_whole_body_highres.nrrd")
    if os.path.exists(female_in):
        try:
            upsample_volume(female_in, female_out, z_factor=4.0)
        except Exception as e:
            print(f"Failed to upsample female: {e}")
    else:
        print(f"Error: {female_in} not found.")
