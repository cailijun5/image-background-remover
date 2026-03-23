from rembg import remove
from PIL import Image

def remove_background(input_path, output_path):
    """Remove background from an image."""
    with open(input_path, 'rb') as input_file:
        input_data = input_file.read()
    
    output_data = remove(input_data)
    
    with open(output_path, 'wb') as output_file:
        output_file.write(output_data)

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 3:
        print("Usage: python remover.py <input> <output>")
        sys.exit(1)
    
    remove_background(sys.argv[1], sys.argv[2])
