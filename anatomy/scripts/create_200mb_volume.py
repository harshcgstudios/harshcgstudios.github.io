import os
import sys
import nrrd
import numpy as np
import scipy.ndimage as ndimage

def load_nrrd_with_endian_fix(filepath):
    with open(filepath, 'rb') as f:
        content = f.read()
        
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
    
    if 'endian:' not in header_str:
        header_lines = header_str.split('\n')
        header_lines.insert(1, "endian: little")
        header_str = '\n'.join(header_lines)
        
    fixed_bytes = header_str.encode('utf-8') + sep_double + data_bytes
    
    temp_path = filepath + ".tmp"
    with open(temp_path, 'wb') as tmp_f:
        tmp_f.write(fixed_bytes)
        
    try:
        data, header = nrrd.read(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    return data, header

def process_volume(input_path, output_path, z_factor, sigma):
    print(f"Loading {input_path}...")
    data, header = load_nrrd_with_endian_fix(input_path)
    print(f"Original Shape: {data.shape}")
    
    zoom_factors = (1.0, 1.0, z_factor)
    print(f"Zooming Z-axis by {z_factor}x using cubic spline interpolation...")
    data_zoomed = ndimage.zoom(data, zoom_factors, order=3)
    print(f"New Shape: {data_zoomed.shape}")
    
    if sigma > 0.0:
        print(f"Applying 3D Gaussian filter with sigma={sigma} to smooth out CT scan noise...")
        data_processed = ndimage.gaussian_filter(data_zoomed, sigma=sigma)
    else:
        data_processed = data_zoomed
        
    header['sizes'] = np.array(data_processed.shape)
    
    if 'space directions' in header:
        space_dirs = header['space directions']
        if space_dirs is not None:
            space_dirs = np.array(space_dirs, dtype=float)
            space_dirs[2] = space_dirs[2] / z_factor
            header['space directions'] = space_dirs
            
    header['encoding'] = 'gzip'
    print(f"Writing to {output_path}...")
    nrrd.write(output_path, data_processed, header)
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"[SUCCESS] Wrote dataset to {output_path} - Size: {size_mb:.2f} MB\n")
    return size_mb

if __name__ == "__main__":
    models_dir = r"D:\AI\Antigravity\website\anatomy\models"
    z_factor = 1.4
    sigma = 1.5
    
    if len(sys.argv) > 1:
        z_factor = float(sys.argv[1])
    if len(sys.argv) > 2:
        sigma = float(sys.argv[2])
        
    print(f"Processing with Z factor = {z_factor}, Gaussian sigma = {sigma}")
    
    male_in = os.path.join(models_dir, "visible_human_whole_body.nrrd")
    male_out = os.path.join(models_dir, "visible_human_whole_body_highres.nrrd")
    if os.path.exists(male_in):
        process_volume(male_in, male_out, z_factor, sigma)
        
    female_in = os.path.join(models_dir, "visible_human_female_whole_body.nrrd")
    female_out = os.path.join(models_dir, "visible_human_female_whole_body_highres.nrrd")
    if os.path.exists(female_in):
        process_volume(female_in, female_out, z_factor, sigma)
