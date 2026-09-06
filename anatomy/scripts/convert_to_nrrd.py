import os
import sys
import glob

# Ensure dependencies are clearly prompted if missing
try:
    import numpy as np
except ImportError:
    print("Error: numpy is required. Please install it by running: pip install numpy")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Warning: Pillow (PIL) is not installed. To convert image stacks (PNG/JPG/TIFF), run: pip install Pillow")

try:
    import pydicom
except ImportError:
    print("Warning: pydicom is not installed. To convert DICOM scan directories, run: pip install pydicom")


def write_nrrd(filename, data, spacing=(1.0, 1.0, 1.0)):
    """
    Writes a 3D numpy array to an uncompressed raw NRRD file.
    No external nrrd library required.
    """
    # NRRD expects dimensions as (X, Y, Z) or (Width, Height, Slices)
    # NumPy arrays are typically indexed as (Z, Y, X) -> (Slices, Height, Width)
    # We transpose the data to match NRRD conventions
    data_transposed = data.transpose(2, 1, 0)
    shape = data_transposed.shape

    # Map numpy types to NRRD type descriptors
    dtype_map = {
        np.uint8: 'uint8',
        np.int8: 'int8',
        np.uint16: 'uint16',
        np.int16: 'int16',
        np.uint32: 'uint32',
        np.int32: 'int32',
        np.float32: 'float',
        np.float64: 'double'
    }
    
    dtype_name = dtype_map.get(data_transposed.dtype.type)
    if not dtype_name:
        # Fall back or cast
        data_transposed = data_transposed.astype(np.float32)
        dtype_name = 'float'

    header = [
        "NRRD0004",
        "# Created by Anatomy 3D Viewer Converter",
        f"type: {dtype_name}",
        "dimension: 3",
        f"sizes: {shape[0]} {shape[1]} {shape[2]}",
        f"spacings: {spacing[0]} {spacing[1]} {spacing[2]}",
        "kinds: domain domain domain",
        "encoding: raw",
        "endian: little",
        "" # Ends with an empty line to separate header from binary payload
    ]
    
    header_str = "\n".join(header) + "\n"
    
    with open(filename, 'wb') as f:
        f.write(header_str.encode('utf-8'))
        f.write(data_transposed.tobytes())
    print(f"\n[SUCCESS] Compiled volumetric scan into: {filename}")
    print(f"Dimensions: {shape[0]}x{shape[1]}x{shape[2]} ({dtype_name})")


def convert_images_to_nrrd(folder_path, output_name, extension='tiff'):
    """Reads a sorted list of image slices and packs them into a 3D volume."""
    search_path = os.path.join(folder_path, f"*.{extension}")
    files = sorted(glob.glob(search_path))
    
    if not files:
        print(f"No files matching *.{extension} found in {folder_path}")
        return False
        
    print(f"Found {len(files)} slices. Reading images...")
    
    # Load first slice to determine resolution
    try:
        first_img = Image.open(files[0])
        width, height = first_img.size
    except Exception as e:
        print(f"Could not open image {files[0]}: {e}")
        return False
        
    # Allocate 3D array (Slices, Height, Width)
    # Using float32 for normalized range 0.0 - 1.0 or raw values
    volume = np.zeros((len(files), height, width), dtype=np.uint8)
    
    for idx, f in enumerate(files):
        img = Image.open(f).convert('L') # Convert to Grayscale
        volume[idx] = np.array(img)
        print(f"\rReading slice {idx+1}/{len(files)}...", end="")
    
    write_nrrd(output_name, volume)
    return True


def convert_dicom_to_nrrd(folder_path, output_name):
    """Reads a sorted list of DICOM files and packs them into a Hounsfield Unit volume."""
    files = []
    for root, _, filenames in os.walk(folder_path):
        for f in filenames:
            if f.lower().endswith(('.dcm', '.dicom')) or f.isdigit(): # Some PACS use plain numbers
                files.append(os.path.join(root, f))
                
    if not files:
        print(f"No DICOM files found in {folder_path}")
        return False
        
    print(f"Found {len(files)} DICOM files. Reading slices...")
    
    # Read slices and sort by Instance Number or Image Position Z
    slices = []
    for f in files:
        try:
            ds = pydicom.dcmread(f)
            # Ensure it is a 3D slice dataset
            if hasattr(ds, 'PixelData'):
                slices.append(ds)
        except Exception:
            continue
            
    if not slices:
        print("No valid pixel datasets could be read.")
        return False
        
    # Sort slices by position
    try:
        slices.sort(key=lambda s: int(s.InstanceNumber) if hasattr(s, 'InstanceNumber') else s.ImagePositionPatient[2])
    except Exception:
        print("Warning: Could not sort slices automatically, using file order.")
        
    # Calculate physical spacing if available
    spacing = (1.0, 1.0, 1.0)
    if hasattr(slices[0], 'PixelSpacing') and hasattr(slices[0], 'SliceThickness'):
        spacing = (float(slices[0].PixelSpacing[0]), float(slices[0].PixelSpacing[1]), float(slices[0].SliceThickness))
        
    # Read dimensions
    height, width = slices[0].pixel_array.shape
    volume = np.zeros((len(slices), height, width), dtype=np.int16)
    
    for idx, ds in enumerate(slices):
        img = ds.pixel_array
        # Rescale intercept & slope to Hounsfield Units if specified
        if hasattr(ds, 'RescaleIntercept') and hasattr(ds, 'RescaleSlope'):
            img = img * float(ds.RescaleSlope) + float(ds.RescaleIntercept)
        volume[idx] = img.astype(np.int16)
        print(f"\rReading slice {idx+1}/{len(slices)}...", end="")
        
    write_nrrd(output_name, volume, spacing=spacing)
    return True


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("=== Anatomy 3D Viewer Volume Compiler ===")
        print("Usage:")
        print("  python convert_to_nrrd.py <scan_folder_path> <output_file.nrrd> [format]")
        print("\nFormats:")
        print("  dicom : Parses all DICOM slices inside the directory (Default if format omitted)")
        print("  tiff  : Parses sorted TIFF images in directory")
        print("  png   : Parses sorted PNG images in directory")
        print("  jpg   : Parses sorted JPG/JPEG images in directory")
        print("\nExample:")
        print("  python convert_to_nrrd.py C:/Users/Downloads/specimen_slices output.nrrd png")
        sys.exit(1)
        
    folder = sys.argv[1]
    out_file = sys.argv[2]
    fmt = sys.argv[3].lower() if len(sys.argv) > 3 else 'dicom'
    
    if not os.path.exists(folder):
        print(f"Error: Folder path '{folder}' does not exist.")
        sys.exit(1)
        
    if fmt == 'dicom':
        convert_dicom_to_nrrd(folder, out_file)
    elif fmt in ('tiff', 'tif', 'png', 'jpg', 'jpeg'):
        convert_images_to_nrrd(folder, out_file, fmt)
    else:
        print(f"Unsupported format: {fmt}. Use: dicom, tiff, png, or jpg.")
