import os
import sys

# Ensure dependencies are available
try:
    import numpy as np
except ImportError:
    print("Error: numpy is required. Run: pip install numpy")
    sys.exit(1)

try:
    import nibabel as nib
except ImportError:
    print("Error: nibabel is required. Run: pip install nibabel")
    sys.exit(1)

try:
    import nrrd
except ImportError:
    print("Error: pynrrd is required. Run: pip install pynrrd")
    sys.exit(1)


def convert_nii_to_nrrd(nii_path, nrrd_path, min_hu=-1000, max_hu=1500):
    """
    Converts a NIfTI volume to a compressed uint8 NRRD volume.
    Clips HU intensities to [min_hu, max_hu] and rescales to [0, 255].
    """
    print(f"Loading NIfTI file: {nii_path}")
    if not os.path.exists(nii_path):
        print(f"Error: File '{nii_path}' does not exist.")
        return False

    try:
        img = nib.load(nii_path)
        data = img.get_fdata()
        affine = img.affine
        header_nii = img.header
        zooms = header_nii.get_zooms()
        
        print(f"Original Shape: {data.shape}")
        print(f"Original Zooms: {zooms}")
        print(f"Original Value Range: Min={np.min(data)}, Max={np.max(data)}")

        # 1. Clip intensities to standard Hounsfield Unit range
        # Air = -1000, dense bone = +1000 to +1500.
        # This removes out-of-boundary reconstruction padding (e.g. -3024)
        print(f"Clipping intensities to [{min_hu}, {max_hu}] HU...")
        clipped = np.clip(data, min_hu, max_hu)

        # 2. Rescale to uint8 [0, 255]
        print("Rescaling voxel values to uint8 [0, 255]...")
        rescaled = ((clipped - min_hu) / (max_hu - min_hu) * 255.0).astype(np.uint8)

        # 3. Create NRRD spatial metadata using the NIfTI affine matrix
        # NIfTI affine matrix is RAS (Right-Anterior-Superior).
        # NRRD space coordinate system defaults to left-posterior-superior (LPS) or right-anterior-superior (RAS).
        # We specify the space as 'right-anterior-superior' (or 'RAS') to preserve orientation.
        # space directions are the column vectors (for X, Y, Z coordinates) of the 3x3 scaling/rotation part
        space_directions = [
            affine[0:3, 0].tolist(), # X spacing/orientation vector
            affine[0:3, 1].tolist(), # Y spacing/orientation vector
            affine[0:3, 2].tolist()  # Z spacing/orientation vector
        ]
        space_origin = affine[0:3, 3].tolist() # Translation vector

        # Build custom header
        header = {
            'type': 'uint8',
            'dimension': 3,
            'space': 'right-anterior-superior',
            'space directions': space_directions,
            'space origin': space_origin,
            'kinds': ['domain', 'domain', 'domain'],
            'encoding': 'gzip' # Force gzip compression for small file sizes (4-6MB)
        }

        print(f"Writing compressed NRRD file: {nrrd_path}")
        nrrd.write(nrrd_path, rescaled, header)
        
        # Verify written file size
        disk_size = os.path.getsize(nrrd_path) / (1024 * 1024)
        print(f"[SUCCESS] Converted volume written to {nrrd_path}")
        print(f"Compressed file size on disk: {disk_size:.2f} MB")
        return True

    except Exception as e:
        print(f"Error converting NIfTI to NRRD: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("=== NIfTI to Compressed NRRD Converter ===")
        print("Usage:")
        print("  python convert_nifti_to_nrrd.py <input.nii.gz> <output.nrrd> [min_hu] [max_hu]")
        sys.exit(1)

    in_nii = sys.argv[1]
    out_nrrd = sys.argv[2]
    min_val = int(sys.argv[3]) if len(sys.argv) > 3 else -1000
    max_val = int(sys.argv[4]) if len(sys.argv) > 4 else 1500

    convert_nii_to_nrrd(in_nii, out_nrrd, min_val, max_val)
