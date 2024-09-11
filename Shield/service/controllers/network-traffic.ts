import mongoose, { ConnectOptions } from 'mongoose';
import { exec } from 'child_process';

// MongoDB Connection
export const connectToDatabase = async () => {
  try {
    await mongoose.connect('mongodb+srv://admin:admin@cluster0.1wgqgg8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      // Updated Mongoose options
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as ConnectOptions); // Cast to ConnectOptions to prevent TypeScript errors

    console.log('Tshark - MongoDB connection established');
  } catch (error) {
    console.error('Tshark - Error connecting to MongoDB:', error);
  }
};

// Schema Definition for Network Traffic
const networkTrafficSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  sourceIP: String,
  destinationIP: String,
  sourcePort: Number,
  destinationPort: Number,
  protocol: String,
  packetLength: Number,
  flags: String,
  info: String,
});

const NetworkTraffic = mongoose.model('NetworkTraffic', networkTrafficSchema);

// Function to Capture Network Traffic using TShark
export const captureNetworkTraffic = () => {
  const tsharkCommand = `tshark -i eth0 -T fields -e frame.time_epoch -e ip.src -e ip.dst -e tcp.srcport -e tcp.dstport -e udp.srcport -e udp.dstport -e frame.len -e _ws.col.Protocol -e tcp.flags -e _ws.col.Info`;

  const tshark = exec(tsharkCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Tshark - Error running TShark: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Tshark - TShark stderr: ${stderr}`);
      return;
    }

    processTsharkOutput(stdout);
  });
};

// Function to process TShark output and store data into MongoDB
export const processTsharkOutput = async (output: string) => {
  const lines = output.split('\n');
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 9) {
      const [
        timestamp,
        sourceIP,
        destinationIP,
        sourcePortTCP,
        destinationPortTCP,
        sourcePortUDP,
        destinationPortUDP,
        packetLength,
        protocol,
        flags,
        info,
      ] = parts;

      const sourcePort = protocol === 'TCP' ? sourcePortTCP : sourcePortUDP;
      const destinationPort = protocol === 'TCP' ? destinationPortTCP : destinationPortUDP;

      const networkTraffic = new NetworkTraffic({
        timestamp: new Date(parseFloat(timestamp) * 1000),
        sourceIP,
        destinationIP,
        sourcePort: sourcePort ? parseInt(sourcePort, 10) : null,
        destinationPort: destinationPort ? parseInt(destinationPort, 10) : null,
        protocol,
        packetLength: parseInt(packetLength, 10),
        flags,
        info,
      });

      try {
        await networkTraffic.save();
        console.log(`Tshark - Saved traffic from ${sourceIP} to ${destinationIP}`);
      } catch (error) {
        console.error('Tshark - Error saving network traffic:', error);
      }
    }
  }
};

// Main function to initialize database connection and start capturing traffic
export const main = async () => {
  await connectToDatabase();
  captureNetworkTraffic();
};
