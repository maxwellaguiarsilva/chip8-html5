/* 
 * Author: Maxwell Aguiar Silva
 * E-mail: maxwellaguiarsilva@gmail.com
 * A Chip8 emulator written in javascript and HTML5! 
 * 
*/

// Chip8 constants. 
var DISPLAY_WIDTH = 0x40; // 64 pixels. 
var DISPLAY_HEIGHT = 0x20; // 32 pixels. 
var DISPLAY_ARRAY_SIZE = 0x0100; // 2048 bits. 

var MEMORY_SIZE = 0x1000; // 4096 bytes. 
var NUMBER_OF_REGISTERS = 0x10; // 16 registers, 16 bytes. 
var STACK_SIZE = 0x10; // 16 ( two bytes for each address ). 
var STARTING_ADDRESS = 0x200; // Load ROM into RAM at address 512d ( 0x200 ). 
var CHARACTER_HEIGHT = 5; // 5 lines to draw a number into screen. 

var BITS_BYTE = 0x08; // 08 bits in a byte. 
var MASK_BYTE = 0xFF; // 255 number as 8 bits mask. 
var R0x4_BITS = 0x04; // 04 bits in a hexadecimal digits. 
var R0x8_BITS = 0x08; // 08 bits in two hexadecimal digit. 
var R0xC_BITS = 0x0C; // 12 bits in tree hexadecimal digit. 

var MASK_F = 0xF000; // Only first. 
var MASK_S = 0x0F00; // Only second. 
var MASK_T = 0x00F0; // Only third. 
var MASK_L = 0x000F; // Only last. 
var MASK_V = 0x00FF; // Value mask. 
var MASK_A = 0x0FFF; // Address mask. 
var MASK_W = 0xFFFF; // All digits mask ( word value ). 
var MASK_FL = 0xF00F; // First and last. 
var MASK_FV = 0xF0FF; // First and value. 


// Make a word number. 
var byteToWord = ( function( highByte, lowerByte){ 
    
    return ( highByte << BITS_BYTE ) | ( lowerByte & MASK_BYTE ); 
    
} ); 

// Listener pattern
var Listenable = ( function(  ){ 
    
    
    // Add a listener. 
    this.addListener = ( function( listener ){ 
        
        listeners.push( listener ); 
        
    } ); 
    
    // Dispatch an event for all listeners. 
    this.notify = ( function( eventName ){ 
        
        var args = Array.prototype.slice.call( arguments, 1 ), count; 
        
        for( count = 0; count < listeners.length; count++ ) 
            if( typeof listeners[ count ][ eventName ] == 'function' ) 
                listeners[ count ][ eventName ].apply( null, args ); 
        
    } ); 
    
    
    var listeners = new Array(  ); // Listeners set. 
    
    
} ); 


// Chip8 emulator. 
var Chip8 = ( function( guiInterface ){ 
    
    
    // Stores and manages the display data. 
    var Display = ( function(  ){ 
        
        
        // Draw column data with the XOR operator. 
        this.draw = ( function( data, left, top ){ 
            
            var flag = false; 
            var highByteIndex, lowerByteIndex, highByteFilter, lowerByteFilter, scroll; 
            var dataWord, filterWord; 
            var count; 
            
            for( count = 0; count < data.length; count++ ) // column height
            { 
                
                scroll = ( left % BITS_BYTE ); 
                
                highByteIndex = Math.floor( ( ( /* column height */ top + count ) * DISPLAY_WIDTH + left ) / BITS_BYTE ) % data.length; 
                highByteFilter = data[ count ] >> scroll; 
                data[ highByteIndex  ] ^= highByteFilter; 
                
                lowerByteFilter = ( data[ count ] << ( BITS_BYTE - scroll ) ) & MASK_BYTE; 
                lowerByteIndex = ( highByteIndex + 1 ) % data.length; 
                data[ lowerByteIndex ] ^= lowerByteFilter; 
                
                // Set the flag if any screen pixels are flipped from 1 to 0 ( 1 XOR 1 = 0 ). 
                dataWord = byteToWord( data[ highByteIndex ], data[ lowerByteIndex ] ); 
                filterWord = byteToWord( highByteFilter, lowerByteFilter ); 
                
                if( ( dataWord & filterWord ) != filterWord ) 
                    flag = true; 
            } 
            
            return flag; 
            
        } ); 
        
        // Clear display data. 
        this.clear = ( function(  ){ 
            
            var count = 0; 
            
            for( count = 0; count < data.length; count++ )
                data[ count ] = 0x0; 
            
            return true; 
            
        } ); 
        
        // Get data used to render the screen. 
        this.getData = ( function(  ){ 
            
            // JavaScript does not have a native read-only list interface ( and "splice" is slow to do this ). 
            return data; 
            
        } ); 
        
        
        var data = new Uint8Array( DISPLAY_ARRAY_SIZE ); // 2048 bits. 
        
        
    } ); 
    
    // Central Processing Unit - Emulate the processor and the memory of chip8. 
    var CPU = ( function( chip8Interface ){ 
        
        
        // Reset the CPU state and data. 
        this.reset = ( function(  ){ 
            
            var count = 0; 
            
            // Reset the memory RAM. 
            {
                // CHARACTERS FONT. 
                for( count = 0; count < CHARACTERS.length; count++ ) 
                    memory[ count ] = CHARACTERS[ count ]; 
                // Empty. 
                for( ; count < STARTING_ADDRESS; count++ ) 
                    memory[ count ] = 0; 
                // ROM. 
                var END_ROM_ADDRESS = STARTING_ADDRESS + romdata.length; // Calculate out of the loop. 
                for( ; count < END_ROM_ADDRESS; count++ ) 
                    memory[ count ] = romdata[ count ]; 
                // Empty. 
                for( ; count < memory.length; count++ ) 
                    memory[ count ] = 0; 
            }
            
            // Reset registers. 
            for( count = 0; count < NUMBER_OF_REGISTERS; count++ ) // register vector. 
                registers[ count ] = 0; 
            pc_register = STARTING_ADDRESS; // Starting in address 0x200. 
            i_register = 0; 
            
            // Reset the stack and stack register. 
            sp_register = 0; 
            for( count = 0; count < STACK_SIZE; count++ ) 
                stack[ count ] = 0; 
            
            // Reset timers. 
            delayTimer = 0; 
            soundTimer = 0; 
            
            
        } ); 
        
        // Emulate the cycle of CPU. 
        this.cycle = ( function(  ){ 
            
            var opcode = byteToWord( memory[ pc_register++ ], memory[ pc_register++ ] ); // Gets current instruction. 
            var f_op = ( opcode & MASK_F ) >> R0xC_BITS; // Get first hexadecimal digit. 
            var x_op = ( opcode & MASK_S ) >> R0x8_BITS; // Get second hexadecimal digit. 
            var y_op = ( opcode & MASK_T ) >> R0x4_BITS; // Get third hexadecimal digit. 
            var value_op = ( opcode & MASK_V ); // Gets lower byte of "opcode". 
            var address_op = ( opcode & MASK_A ); // Get a 12-bit value used as the memory address. 
            
            var result, value_one, value_two, condition; // Used to run the instruction. 
            var instruction; // Instruction identifier. 
            
            instruction = INSTRUCTION_NUMBER.indexOf( opcode & INSTRUCTION_MASK[ f_op ] ); 
            
            
            /*
            
                ==================================================
                26
                        // 0xFX0A
                        case 0x000A: // LD Vx, K
                            chip8.waitKey( function( key ){ 
                                registers[ x ] = key; 
                            } ); 
                ==================================================
                        // 0xFX15
                        case 0x0015: // LD DT, Vx
                            delayTimer = registers[ x ]; 
                ==================================================
                        // 0xFX18
                        case 0x0018: // LD ST, Vx
                            soundTimer = registers[ x ]; 
                ==================================================
                        // 0xFX1E
                        case 0x001E: // ADD I, Vx
                            address += registers[ x ]; 
                ==================================================
                        // 0xFX29
                        case 0x0029: // LD F, Vx
                            address = registers[ x ] * ROWS_CARACTER; 
                ==================================================
                        // 0xFX33
                        case 0x0033: // LD B, Vx
                            for( var localCount = 0; localCount < 3; localCount++ ) 
                                memory[ address + localCount ] = Math.floor( registers[ x ] / ( Math.pow( 10, 2 - localCount ) ) % 10 ); 
                ==================================================
                        // 0xFX55
                        case 0x0055: // LD [I], Vx
                            for( var localCount = 0; localCount <= x; localCount++ ) 
                                memory[ address + localCount ] = registers[ localCount ]; 
                ==================================================
                        // 0xFX65
                        case 0x0065: // LD Vx, [I]
                            for( var localCount = 0; localCount <= x; localCount++ ) 
                                registers[ localCount ] = memory[ address + localCount ]; 
                ==================================================
                    } 
            
            */
            
            
            if( BIT_MATCH( '' /* 00 */, instruction ) ) display.clear( ); // Display clear. 
            if( BIT_MATCH( '' /* 22 */, instruction ) ) registers[ FLAG_REGISTER ] = +( display.draw( memory.subarray( i_register, i_register + MASK_L, registers[ x_op ], registers[ y_op ] ) ) ); // Draw sprite in screen. 
            
            
            if( BIT_MATCH( '' /* 01, 03 */, instruction ) ) value_one = sp_register; // SP as value one. 
            if( BIT_MATCH( '' /* 04, 05, 06, 08, 10, 11, 12, 13, 14, 15, 16, 17, 18 */, instruction ) ) value_one = registers[ x_op ]; // VX as value one. 
            if( BIT_MATCH( '' /* 20 */, instruction ) ) value_one = registers[ 0 ]; // V0 as value one. 
            if( BIT_MATCH( '' /* 21 */, instruction ) ) value_one = Math.floor( Math.random(  ) * MASK_BYTE ); // A ramdom number as value one. 
            
            
            if( BIT_MATCH( '' /* 01, 03, 15, 17 */, instruction ) ) value_two = 1; // Use to increase or decrease a value. 
            if( BIT_MATCH( '' /* 04, 05, 08, 21 */, instruction ) ) value_two = value_op; // Value in opcode as value two. 
            if( BIT_MATCH( '' /* 06, 10, 11, 12, 13, 14, 16, 18 */, instruction ) ) value_two = registers[ y_op ]; // VY as value two. 
            if( BIT_MATCH( '' /* 20 */, instruction ) ) value_two = address_op; // Address in opcode as value two. 
            
            if( BIT_MATCH( '' /* 03, 08, 13, 20 */, instruction ) ) result = value_one + value_two; // Addition. 
            if( BIT_MATCH( '' /* 01, 14, 16 */, instruction ) ) result = value_one - value_two; // Subtraction. 
            
            if( BIT_MATCH( '' /* 10 */, instruction ) ) result = value_one | value_two; // Bitwise OR. 
            if( BIT_MATCH( '' /* 11, 21 */, instruction ) ) result = value_one & value_two; // Bitwise AND. 
            if( BIT_MATCH( '' /* 12 */, instruction ) ) result = value_one ^ value_two; // Bitwise XOR. 
            if( BIT_MATCH( '' /* 15 */, instruction ) ) result = ( value_one >> value_two ) | ( ( value_one & 1 ) << BITS_BYTE ) ; // Shift right. 
            if( BIT_MATCH( '' /* 17 */, instruction ) ) result = value_one << value_two; // Shift left. 
            
            if( BIT_MATCH( '' /* 16 */, instruction ) ) result = -result ; // Invert result. 
            
            
            
            if( BIT_MATCH( '' /* 04, 06 */, instruction ) ) condition = ( value_one == value_two ); // Equal. 
            if( BIT_MATCH( '' /* 05, 18 */, instruction ) ) condition = ( value_one != value_two ); // Different. 
            if( BIT_MATCH( '' /* 23 */, instruction ) ) condition =  chip8Interface.isKeyPressed( registers[ x_op ] ); // If key of number in VX is pressed. 
            if( BIT_MATCH( '' /* 24 */, instruction ) ) condition = !chip8Interface.isKeyPressed( registers[ x_op ] ); // If key of number in VX isn't pressed. 
            
            
            if( BIT_MATCH( '' /* 01, 03 */, instruction ) ) sp_register = result; // SP as target. 
            
            
            if( BIT_MATCH( '' /* 25 */, instruction ) ) result = delayTimer; // Get delay timer. 
            if( BIT_MATCH( '' /* 09 */, instruction ) ) result = registers[ y_op ]; // Get VY. 
            if( BIT_MATCH( '' /* 07 */, instruction ) ) result = value_op; // Get value in opcode. 
            if( BIT_MATCH( '' /* 01 */, instruction ) ) result = stack[ sp_register ]; // Get stack value. 
            if( BIT_MATCH( '' /* 03 */, instruction ) ) result = pc_register; // Get PC. 
            if( BIT_MATCH( '' /* 03 */, instruction ) ) stack[ sp_register ] = result; // Stack as target. 
            if( BIT_MATCH( '' /* 02, 03, 19 */, instruction ) ) result = address_op; // Get address in opcode. 
            
            
            
            
            if( BIT_MATCH( '' /* 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 21, 25 */, instruction ) ) registers[ x_op ] = result; // VX as target. 
            if( BIT_MATCH( '' /* 01, 02, 03, 20 */, instruction ) ) pc_register = result; // PC as target. 
            if( BIT_MATCH( '' /* 19 */, instruction ) ) i_register = result; // I register as target. 
            
            if( BIT_MATCH( '' /* 04, 05, 06, 18, 23, 24 */, instruction ) ) pc_register = ( condition ? pc_register + INSTRUCTION_SIZE : pc_register ); // Conditional skip. 
            
            if( BIT_MATCH( '' /* 00, 22 */, instruction ) ) chip8Interface.setDrawFlag(  ); // Set draw flag. 
            if( BIT_MATCH( '' /* 13, 15, 17 */, instruction ) ) registers[ FLAG_REGISTER ] = +( result > MASK_BYTE ); // Carry flag. 
            if( BIT_MATCH( '' /* 14, 16 */, instruction ) ) registers[ FLAG_REGISTER ] = +( result >= 0 ); // Signed flag. 
            
            // if( BIT_MATCH( '' /*  */, instruction ) ) 
            
        } ); 
        
        // Load the ROM into memory. 
        this.load = ( function( data ){ 
            
            romdata = data.slice(  ); // "slice" used to copy the array. 
            
        } ); 
        
        
        var memory = new Uint8Array( MEMORY_SIZE ); // RAM Memory with 4KB. 
        var registers = new Uint8Array( NUMBER_OF_REGISTERS ); // 16 registers. 
        var stack  = new Array( STACK_SIZE ); // 16 bits in each index ( https://en.wikipedia.org/wiki/Call_stack ). 
        var sp_register = 0; // Address of stack level ( https://en.wikipedia.org/wiki/Stack_register ). 
        var pc_register = 0; // Instruction counter ( https://en.wikipedia.org/wiki/Program_counter ). 
        var i_register = 0; // The I register. 
        var delayTimer = 0; // Timer counter ( 60 Hz ). 
        var soundTimer = 0; // Sound timer counter ( 60 Hz ). 
        
        // Hexadecimal characters loaded into memory. 
        var CHARACTERS = [  
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0 #### ..#. #### #### #..# #### #### #### 
            0x20, 0x60, 0x20, 0x20, 0x70, // 1 #..# .##. ...# ...# #..# #... #... ...# 
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2 #..# ..#. #### #### #### #### #### ..#. 
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3 #..# ..#. #... ...# ...# ...# #..# .#.. 
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4 #### .### #### #### ...# #### #### .#.. 
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5 
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6 #### #### #### ###. #### ###. #### #### 
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7 #..# #..# #..# #..# #... #..# #... #... 
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8 #### #### #### ###. #... #..# #### #### 
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9 #..# ...# #..# #..# #... #..# #... #... 
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A #### #### #..# ###. #### ###. #### #... 
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B 
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C 
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D 
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E 
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F 
        ]; 
        
        // Instruction identifiers. 
        var N___ = MASK_F; // Only first. 
        var N__N = MASK_FL; // First and last. 
        var N_NN = MASK_FV; // First and value. 
        var NNNN = MASK_W; // All digits. 
        
        var INSTRUCTION_NUMBER = [ 
                0x00E0, // 00E0    Clears the screen. 
                0x00EE, // 00EE    Returns from a subroutine. 
                0x1000, // 1NNN    Jumps to address NNN. 
                0x2000, // 2NNN    Calls subroutine at NNN. 
                0x3000, // 3XNN    Skips the next instruction if VX equals NN. 
                0x4000, // 4XNN    Skips the next instruction if VX doesn't equal NN. 
                0x5000, // 5XY0    Skips the next instruction if VX equals VY. 
                0x6000, // 6XNN    Sets VX to NN. 
                0x7000, // 7XNN    Adds NN to VX. 
                0x8000, // 8XY0    Sets VX to the value of VY. 
                0x8001, // 8XY1    Sets VX to VX or VY.
                0x8002, // 8XY2    Sets VX to VX and VY. 
                0x8003, // 8XY3    Sets VX to VX xor VY. 
                0x8004, // 8XY4    Adds VY to VX. VF is set to 1 when there's a carry
                0x8005, // 8XY5    VY is subtracted from VX. VF is set to 0 when there's a borrow. 
                0x8006, // 8XY6    Shifts VX right by one. VF is set to the value of the least significant bit of VX before the shift. 
                0x8007, // 8XY7    Sets VX to VY minus VX. VF is set to 0 when there's a borrow. * 16
                0x800E, // 8XYE    Shifts VX left by one. VF is set to the value of the most significant bit of VX before the shift. 
                0x9000, // 9XY0    Skips the next instruction if VX doesn't equal VY. 
                0xA000, // ANNN    Sets I to the address NNN. 
                0xB000, // BNNN    Jumps to the address NNN plus V0. 
                0xC000, // CXNN    Sets VX to the result of a bitwise and operation on a random number and NN. 
                0xD000, // DXYN    Sprites stored in memory at location in index register (I)
                0xE09E, // EX9E    Skips the next instruction if the key stored in VX is pressed. 
                0xE0A1, // EXA1    Skips the next instruction if the key stored in VX isn't pressed. 
                0xF007, // FX07    Sets VX to the value of the delay timer. 
                0xF00A, // FX0A    A key press is awaited
                0xF015, // FX15    Sets the delay timer to VX. 
                0xF018, // FX18    Sets the sound timer to VX. 
                0xF01E, // FX1E    Adds VX to I. 
                0xF029, // FX29    Sets I to the location of the sprite for the character in VX. Characters 0-F (in hexadecimal) are represented by a 4x5 font. 
                0xF033, // FX33    Stores the Binary-coded decimal representation of VX
                0xF055, // FX55    Stores V0 to VX in memory starting at address I. 
                0xF065  // FX65    Fills V0 to VX with values from memory starting at address I. 
        ]; 
        
        var INSTRUCTION_MASK = [ 
            NNNN, // 0x0 
            N___, // 0x1 
            N___, // 0x2 
            N___, // 0x3 
            N___, // 0x4 
            N__N, // 0x5 
            N___, // 0x6 
            N___, // 0x7  
            N__N, // 0x8 
            N__N, // 0x9 
            N___, // 0xA 
            N___, // 0xB 
            N___, // 0xC 
            N___, // 0xD 
            N_NN, // 0xE 
            N_NN  // 0xF 
        ]; 
        
        var INSTRUCTION_SIZE = 0x02; // Two byte for e ach instruction. 
        var FLAG_REGISTER = 0xF; // VF is flag of chip8. 
        
        // Run code if bit is set in hash. 
        var BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; // Base 64 decode. 
        var B64_BITS = 0x06; 
        var BIT_MATCH = ( function( hash, instruction ){ 
            return ( BASE64.indexOf( hash.charAt( Math.floor( instruction / B64_BITS ) ) ) & ( 1 << ( instruction % B64_BITS ) ) ) != 0; // Check if bit is set. 
        } ); 
        
        // Current ROM loaded. 
        var romdata = [  ]; 
        
        var chip8Interface = chip8Interface; // Used as input and output. 
        
        
    } ); 
    
    // Private chip8 interface. 
    var chip8Interface = ( { 
        // TODO: waitKey, isKeyPressed, setDrawFlag. 
    } ); 
    
    
    // Frame loop of emulator. 
    var frame = ( function(  ){ 
        
        // TODO: 
        
    } ); 
    
    
    var guiInterface = guiInterface; // Graphical User Interface. 
    
    var listenable = new Listenable(  ); // Dispatch chip8 events for all listeners. 
    
    var display = new Display(  ); 
    var cpu = new CPU( chip8Interface ); // CPU of chip8. 
    var running = false; // True if game is running. 
    
    
} ); 
